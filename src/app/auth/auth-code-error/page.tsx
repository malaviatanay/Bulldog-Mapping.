export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Login failed</h1>
        <p className="text-muted-foreground">
          There was a problem signing you in. This can happen if you took too long or accessed the app from a different address.
        </p>
        <a
          href="/login"
          className="inline-block mt-4 px-4 py-2 bg-highlight text-white rounded-lg hover:bg-highlight-hover transition-colors"
        >
          Try again
        </a>
      </div>
    </div>
  );
}
