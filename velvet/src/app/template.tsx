// Re-mounts on every navigation, so the screen fades in like a native app
// pushing a new view. (A layout would not re-run on route change.)
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="screen">{children}</div>;
}
