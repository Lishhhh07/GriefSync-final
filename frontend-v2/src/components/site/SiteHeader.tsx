import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";

export function SiteHeader() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 240], ["rgba(248,247,242,0)", "rgba(248,247,242,0.78)"]);
  const blur = useTransform(scrollY, [0, 240], ["blur(0px)", "blur(20px)"]);
  const textColor = useTransform(scrollY, [200, 360], ["rgba(248,247,242,1)", "rgba(20,40,30,1)"]);
  const subColor = useTransform(scrollY, [200, 360], ["rgba(248,247,242,0.7)", "rgba(20,40,30,0.7)"]);
  return (
    <motion.header
      style={{ backgroundColor: bg as never, backdropFilter: blur as never, color: textColor as never }}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-md bg-gradient-aurora shadow-glow">
            <span className="h-2 w-2 rounded-full bg-ivory" />
          </span>
          <span className="font-display text-[17px] font-medium tracking-tight">
            GriefSync
          </span>
        </Link>
        <motion.nav style={{ color: subColor as never }} className="hidden items-center gap-8 text-[13.5px] md:flex">
          <a href="#vault" className="transition-opacity hover:opacity-100">Vault</a>
          <a href="#monitoring" className="transition-opacity hover:opacity-100">Lifeline</a>
          <a href="#contacts" className="transition-opacity hover:opacity-100">Contacts</a>
          <a href="#readiness" className="transition-opacity hover:opacity-100">Readiness</a>
          <Link to="/dashboard" className="transition-opacity hover:opacity-100">Platform</Link>
        </motion.nav>
        <div className="flex items-center gap-3">
          <motion.span style={{ color: subColor as never }} className="hidden sm:block">
          <Link to="/dashboard" className="text-[13.5px]">
            Sign in
          </Link>
          </motion.span>
          <Link
            to="/dashboard"
            className="group relative inline-flex items-center gap-2 rounded-full border border-current/15 bg-current/5 px-4 py-2 text-[13px] transition-all hover:border-current/40"
            style={{ borderColor: "color-mix(in oklab, currentColor 18%, transparent)" }}
          >
            <span>Get started</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
