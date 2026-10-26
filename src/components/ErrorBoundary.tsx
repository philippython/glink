import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Stops one broken component from blanking the whole page. Without a fallback it renders nothing
 * (for decorative sections); the app-level boundary passes a friendly recovery screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; name?: string }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name ?? 'ui'}] ${error.message}`, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children
  }
}

export function CrashScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 text-center">
      <div>
        <h1 className="title-serif text-[30px] text-fg">Something went wrong.</h1>
        <p className="mt-2 text-[14.5px] text-muted">The page hit an unexpected error. Reloading usually fixes it.</p>
        <button onClick={() => window.location.reload()} className="btn-brand mt-6 inline-flex h-11 items-center rounded-lg px-5 text-[14px] font-medium">Reload the page</button>
      </div>
    </div>
  )
}
