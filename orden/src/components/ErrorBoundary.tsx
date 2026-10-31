import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[orden]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      const { fallback } = this.props
      return typeof fallback === 'function' ? fallback(error, this.reset) : fallback
    }
    return this.props.children
  }
}
