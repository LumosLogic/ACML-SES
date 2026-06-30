"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Mail, Zap, BarChart3, Shield, Globe,
  ArrowRight, Server, Clock, Key,
  Users, TrendingUp, ChevronRight, Menu, X,
} from "lucide-react"

// ─── Data ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: "Multi-Client Management",
    desc: "Onboard multiple clients with isolated API keys, custom domains, and per-client daily send quotas.",
    color: "bg-indigo-500/10 text-indigo-400",
    glow: "hover:shadow-indigo-500/10",
    border: "hover:border-indigo-500/40",
  },
  {
    icon: Zap,
    title: "Bulk Email Queue",
    desc: "Send to thousands of recipients with BullMQ-backed queuing, real-time progress, and automatic retries.",
    color: "bg-amber-500/10 text-amber-400",
    glow: "hover:shadow-amber-500/10",
    border: "hover:border-amber-500/40",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track delivery rates, bounces, and opens with live charts and customisable date ranges.",
    color: "bg-emerald-500/10 text-emerald-400",
    glow: "hover:shadow-emerald-500/10",
    border: "hover:border-emerald-500/40",
  },
  {
    icon: Globe,
    title: "Custom SMTP Support",
    desc: "Use shared AWS SES or configure per-client SMTP credentials and SES configuration sets.",
    color: "bg-violet-500/10 text-violet-400",
    glow: "hover:shadow-violet-500/10",
    border: "hover:border-violet-500/40",
  },
  {
    icon: Shield,
    title: "Suppression Management",
    desc: "Automatic bounce and complaint handling with a global suppression list to protect your sender reputation.",
    color: "bg-red-500/10 text-red-400",
    glow: "hover:shadow-red-500/10",
    border: "hover:border-red-500/40",
  },
  {
    icon: Clock,
    title: "Scheduled Sending",
    desc: "Schedule emails for future delivery with precise timing control via the send_at parameter.",
    color: "bg-cyan-500/10 text-cyan-400",
    glow: "hover:shadow-cyan-500/10",
    border: "hover:border-cyan-500/40",
  },
]

const steps = [
  {
    icon: Key,
    title: "Configure Your Client",
    desc: "Create a client with your domain, SMTP settings, and daily send quota through the admin dashboard.",
    color: "bg-indigo-600/10 border-indigo-500/20 text-indigo-400",
  },
  {
    icon: Mail,
    title: "Send via API",
    desc: "Use your API key to send single or bulk emails — CSV upload, JSON recipients, or plain addresses.",
    color: "bg-emerald-600/10 border-emerald-500/20 text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Track & Analyse",
    desc: "Monitor delivery rates, bounces, and queue status in real time through the analytics dashboard.",
    color: "bg-violet-600/10 border-violet-500/20 text-violet-400",
  },
]

const bigStats = [
  { value: "50k",   label: "Daily Send Quota",  icon: Mail,        color: "bg-indigo-500/10 text-indigo-400",  glow: "hover:shadow-indigo-500/15 hover:border-indigo-500/30" },
  { value: "100/s", label: "Max Send Rate",      icon: Zap,         color: "bg-amber-500/10  text-amber-400",   glow: "hover:shadow-amber-500/15  hover:border-amber-500/30"  },
  { value: "99%+",  label: "Delivery Rate",      icon: TrendingUp,  color: "bg-emerald-500/10 text-emerald-400", glow: "hover:shadow-emerald-500/15 hover:border-emerald-500/30" },
  { value: "∞",     label: "Queue Capacity",     icon: Server,      color: "bg-violet-500/10 text-violet-400",  glow: "hover:shadow-violet-500/15 hover:border-violet-500/30" },
]

const heroStats = [
  { value: "50k",   label: "Emails / Day", icon: Mail,       color: "text-indigo-400" },
  { value: "100/s", label: "Send Rate",    icon: Zap,        color: "text-amber-400"  },
  { value: "99%+",  label: "Delivery",     icon: TrendingUp, color: "text-emerald-400" },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">ACML SES</span>
            </div>

            <div className="hidden md:flex items-center gap-10">
              <a href="#features"     className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</a>
              <a href="#stats"        className="text-sm text-slate-400 hover:text-white transition-colors">Stats</a>
              <a href="/api-reference.html" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">API Docs</a>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link href="/login" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="md:hidden p-2 ml-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 py-3 space-y-0.5">
              {[
                { label: "Features",     href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Stats",        href: "#stats" },
                { label: "API Docs",     href: "/api-reference.html" },
                { label: "Sign In",      href: "/login" },
              ].map(({ label, href }) => (
                <a key={label} href={href}
                  className="block px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-32 overflow-hidden">
        {/* Full-width ambient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-indigo-600/12 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-500/6 rounded-full blur-[80px]" />
        </div>

        <div className="relative w-full px-4 sm:px-8 lg:px-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium px-4 py-2 rounded-full mb-8 cursor-default">
            <Zap className="h-3 w-3" />
            Powered by AWS SES
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 max-w-5xl mx-auto">
            Send Emails at Scale,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">
              With Confidence
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Managed AWS SES infrastructure with per-client quotas, real-time analytics,
            bulk email queuing, and enterprise-grade delivery. Built for teams that need
            reliable email at scale.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Sign In to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-sm hover:-translate-y-0.5">
              Explore Features <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Hero stat cards — full width row */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto lg:max-w-3xl">
            {heroStats.map(({ value, label, icon: Icon, color }) => (
              <div key={label}
                className="group flex flex-col items-center gap-1.5 bg-slate-900/70 border border-slate-700/60 hover:border-slate-500 rounded-2xl px-4 py-6 sm:px-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 hover:bg-slate-800/70">
                <Icon className={`h-5 w-5 mb-1 ${color} transition-transform duration-200 group-hover:scale-110`} />
                <span className="text-2xl sm:text-3xl font-bold text-white">{value}</span>
                <span className="text-xs sm:text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 sm:py-32 border-t border-slate-800/60">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5">Everything you need to send at scale</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              A complete email infrastructure platform built on AWS SES with enterprise-grade
              features — from suppression lists to webhook event tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {features.map(({ icon: Icon, title, desc, color, glow, border }) => (
              <div key={title}
                className={`group bg-slate-900/50 border border-slate-800 ${border} rounded-2xl p-7 transition-all duration-200 cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl ${glow}`}>
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-5 ${color} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-slate-900/40 border-t border-slate-800/60">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5">Up and running in minutes</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg">
              Get your email infrastructure configured and sending in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-10 left-[calc(33%+1.5rem)] right-[calc(33%+1.5rem)] h-px bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-indigo-500/30" />

            {steps.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={title}
                className="group relative flex flex-col items-center text-center px-6 py-8 rounded-2xl border border-slate-800 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-800/30 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20">
                <div className={`relative h-20 w-20 rounded-2xl border flex items-center justify-center mb-6 ${color} transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className="h-8 w-8" />
                  <span className="absolute -top-2.5 -right-2.5 h-6 w-6 bg-indigo-600 rounded-full text-[11px] font-bold flex items-center justify-center text-white shadow-lg">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-3">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section id="stats" className="py-24 sm:py-32 border-t border-slate-800/60">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5">Built for performance</h2>
            <p className="text-slate-400 text-base sm:text-lg">Numbers that define our platform capabilities.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-5xl mx-auto">
            {bigStats.map(({ value, label, icon: Icon, color, glow }) => (
              <div key={label}
                className={`group flex flex-col items-center text-center bg-slate-900/50 border border-slate-800 ${glow} rounded-2xl px-6 py-8 cursor-pointer transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl`}>
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 ${color} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">{value}</div>
                <div className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-slate-800/60">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-slate-900/0 border border-indigo-500/20 hover:border-indigo-500/40 rounded-3xl px-8 py-16 sm:px-16 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-default">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 mb-7">
              <Mail className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-5">Ready to start sending?</h2>
            <p className="text-slate-400 mb-10 max-w-md mx-auto text-base sm:text-lg leading-relaxed">
              Sign in to your dashboard and start sending with enterprise-grade email infrastructure.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Sign In to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10">
        <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">ACML SES</span>
          </div>
          <p className="text-xs text-slate-600 order-last sm:order-none">
            © {new Date().getFullYear()} ACML. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/login"       className="text-xs text-slate-500 hover:text-white transition-colors">Sign In</Link>
            <a href="#features"       className="text-xs text-slate-500 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works"   className="text-xs text-slate-500 hover:text-white transition-colors">How It Works</a>
            <a href="/api-reference.html" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
