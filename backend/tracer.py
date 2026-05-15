import os
import uuid

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "griefsync"})
provider = TracerProvider(resource=resource)

try:
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

    exporter = OTLPSpanExporter(
        endpoint=os.getenv("JAEGER_ENDPOINT", "http://localhost:4317"),
        insecure=True,
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))
except Exception:
    pass  # Jaeger not running — app still works, traces are no-ops

trace.set_tracer_provider(provider)
tracer = trace.get_tracer("griefsync")

_spans = {}


def start_workflow(workflow_id: str, name: str) -> str:
    wf_id = workflow_id or str(uuid.uuid4())
    _spans[wf_id] = tracer.start_span(name)
    return wf_id


def start_span(workflow_id: str, name: str, parent_span_id: str = None) -> str:
    sid = str(uuid.uuid4())
    parent = _spans.get(parent_span_id or workflow_id)
    ctx = trace.set_span_in_context(parent) if parent else None
    _spans[sid] = tracer.start_span(name, context=ctx)
    return sid


def end_span(span_id: str, output: dict = None, error: str = None):
    span = _spans.pop(span_id, None)
    if not span:
        return
    if output:
        for k, v in output.items():
            span.set_attribute(f"output.{k}", str(v))
    if error:
        span.set_attribute("error", error)
    span.end()


def link_webhook(span_id: str, parent_workflow_id: str, event: str):
    span = _spans.get(span_id)
    if span:
        span.set_attribute("webhook.event", event)
        span.set_attribute("webhook.parent_workflow", parent_workflow_id)
