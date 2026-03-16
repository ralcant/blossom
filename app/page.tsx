import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold tracking-tight">Blossom</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Create beautiful karaoke-style videos with AI-generated images and lyrics
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Create Video
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            My Projects
          </Link>
        </div>
      </div>
    </main>
  );
}
