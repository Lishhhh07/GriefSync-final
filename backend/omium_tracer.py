"""
Omium tracing wrapper — drop-in replacement for backend/tracer.py.

When OMIUM_API_KEY is set: uses OmiumTracer + Span objects to record spans
with explicit parent-child relationships, flushed to the Omium dashboard.
When OMIUM_API_KEY is absent: falls back to OpenTelemetry/Jaeger (backend/tracer.py).

The four exported functions maintain identical signatures to backend/tracer.py.
"""

import os
import sys
import uuid
import time
from datetime import datetime, timezone

_OMIUM_API_KEY = os.getenv("OMIUM_API_KEY")
_use_omium = False
_omium = None
_omium_config = None
_tracer = None
Span = None

if _OMIUM_API_KEY:
    try:
        import omium
        _omium_config = omium.init(
            api_key=_OMIUM_API_KEY,
            project="griefsync",
            auto_trace=False,
            auto_checkpoint=False,
            debug=True,
        )
        _omium = omium

        # Import the real tracer and span classes
        from omium.integrations.tracer import OmiumTracer, Span as OmiumSpan
        Span = OmiumSpan

        # Create a single tracer instance for the app lifetime
        _tracer = OmiumTracer()
        _use_omium = True
        print("[omium_tracer] Omium SDK initialized with OmiumTracer", flush=True)
    except ImportError:
        print("[omium_tracer] 'omium' package not installed. "
              "Falling back to OpenTelemetry/Jaeger. "
              "Install from sponsor: pip install omium",
              file=sys.stderr)
    except Exception as e:
        print(f"[omium_tracer] omium init failed: {e} — falling back to OpenTelemetry", file=sys.stderr)

# Fallback: import from the OpenTelemetry/Jaeger implementation
if not _use_omium:
    from backend.tracer import (
        start_workflow as _otel_start_workflow,
        start_span as _otel_start_span,
        end_span as _otel_end_span,
        link_webhook as _otel_link_webhook,
    )

# Internal state for span tracking
_workflows = {}  # workflow_id -> {"name": str, "trace_id": str}
_spans = {}      # span_id -> Span object (real Omium Span)

# Recent trace log for frontend visibility (ring buffer of last 100 entries)
_trace_log = []
_TRACE_LOG_MAX = 100


def _log_trace(entry: dict):
    """Add an entry to the in-memory trace log for frontend consumption."""
    entry["timestamp"] = datetime.now(timezone.utc).isoformat()
    _trace_log.append(entry)
    if len(_trace_log) > _TRACE_LOG_MAX:
        _trace_log.pop(0)


def get_trace_log(limit: int = 50) -> list:
    """Return recent trace entries for the frontend."""
    return _trace_log[-limit:]


def get_trace_stats() -> dict:
    """Return aggregate trace stats for the frontend."""
    total = len(_trace_log)
    errors = sum(1 for e in _trace_log if e.get("status") == "error")
    successes = total - errors
    agents = {}
    for e in _trace_log:
        agent = e.get("agent", "unknown")
        if agent not in agents:
            agents[agent] = {"total": 0, "errors": 0, "avg_ms": 0, "durations": []}
        agents[agent]["total"] += 1
        if e.get("status") == "error":
            agents[agent]["errors"] += 1
        if e.get("duration_ms"):
            agents[agent]["durations"].append(e["duration_ms"])

    # Calculate averages
    for agent_data in agents.values():
        durations = agent_data.pop("durations")
        agent_data["avg_ms"] = round(sum(durations) / len(durations)) if durations else 0

    return {
        "total_spans": total,
        "errors": errors,
        "successes": successes,
        "error_rate": round(errors / total * 100, 1) if total > 0 else 0,
        "agents": agents,
    }


def discover_omium_api():
    """Print available Omium SDK methods at startup for verification."""
    if _omium:
        methods = [m for m in dir(_omium) if not m.startswith('_')]
        print(f"[omium_tracer] Available Omium methods: {methods}", flush=True)
        if _tracer:
            print(f"[omium_tracer] Tracer active: trace_id={_tracer.trace_id}, project={_tracer.project}", flush=True)


def start_workflow(workflow_id: str, name: str) -> str:
    """Start a new workflow trace."""
    if _use_omium:
        wf_id = workflow_id or str(uuid.uuid4())
        try:
            _omium.set_execution_id(wf_id)
            _workflows[wf_id] = {
                "name": name,
                "trace_id": _tracer.trace_id,
                "start_time": time.time(),
            }
            _log_trace({
                "type": "workflow_start",
                "workflow_id": wf_id,
                "name": name,
                "agent": name.split(".")[0] if "." in name else name,
                "status": "running",
            })
        except Exception as e:
            print(f"[omium_tracer] start_workflow error: {e}", file=sys.stderr)
        return wf_id
    return _otel_start_workflow(workflow_id, name)


def start_span(workflow_id: str, name: str, parent_span_id: str = None) -> str:
    """Start a new span within a workflow."""
    if _use_omium:
        sid = str(uuid.uuid4())
        try:
            _omium.set_execution_id(workflow_id)

            # Determine parent
            parent_id = None
            if parent_span_id and parent_span_id in _spans:
                parent_id = _spans[parent_span_id].span_id

            # Determine span_type based on name
            span_type = "function"

            # Create a real Omium Span object
            span = Span(
                span_id=sid,
                name=name,
                trace_id=_tracer.trace_id,
                parent_span_id=parent_id,
                span_type=span_type,
                start_time=time.time(),
            )
            # Store metadata for logging
            span._gs_workflow_id = workflow_id
            span._gs_start = time.time()
            _spans[sid] = span
        except Exception as e:
            print(f"[omium_tracer] start_span error: {e}", file=sys.stderr)
        return sid
    return _otel_start_span(workflow_id, name, parent_span_id)


def end_span(span_id: str, output: dict = None, error: str = None):
    """End a span, optionally attaching output or error."""
    if _use_omium:
        span = _spans.pop(span_id, None)
        if not span:
            return
        try:
            duration_ms = round((time.time() - getattr(span, '_gs_start', time.time())) * 1000)
            workflow_id = getattr(span, '_gs_workflow_id', 'unknown')

            # Set output on the span
            if output:
                span.set_output(output)

            # Only report REAL errors to Omium — skip informational statuses entirely
            is_real_error = False
            if error:
                is_real_error = any(kw in error.lower() for kw in [
                    "exception", "traceback", "failed", "timeout",
                    "connection", "refused", "denied", "invalid",
                    "not found", "500", "503",
                ])
                if is_real_error:
                    span.set_error(Exception(error))
                # Non-critical messages: just ignore them, don't put in span at all

            # If no error, explicitly mark as successful
            if not is_real_error and not output:
                span.set_output({"status": "success"})

            # End the span
            span.end()

            # Add to tracer and flush
            with _tracer._lock:
                _tracer._spans.append(span)
            _tracer.flush()

            # Log for frontend
            agent_name = span.name.split(".")[0] if "." in span.name else span.name
            _log_trace({
                "type": "span_end",
                "span_id": span_id,
                "workflow_id": workflow_id,
                "name": span.name,
                "agent": agent_name,
                "status": "error" if error and is_real_error else "ok",
                "duration_ms": duration_ms,
                "output": output,
                "error": error if error and is_real_error else None,
            })
        except Exception as e:
            print(f"[omium_tracer] end_span error: {e}", file=sys.stderr)
        return
    _otel_end_span(span_id, output, error)


def link_webhook(span_id: str, parent_workflow_id: str, event: str):
    """Link a webhook span back to its parent workflow."""
    if _use_omium:
        span = _spans.get(span_id)
        if span:
            try:
                _omium.set_execution_id(parent_workflow_id)
                span.set_attribute("webhook.event", event)
                span.set_attribute("webhook.parent_workflow", parent_workflow_id)
                span.set_attribute("link_type", "webhook_causal")
            except Exception as e:
                print(f"[omium_tracer] link_webhook error: {e}", file=sys.stderr)
        return
    _otel_link_webhook(span_id, parent_workflow_id, event)


def is_active() -> bool:
    """Check if Omium tracing is active."""
    return _use_omium
