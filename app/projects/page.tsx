"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectStorage } from "@/lib/storage";
import { Project, STYLE_TEMPLATES } from "@/types/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const projectIds = ProjectStorage.list();
    const loadedProjects = projectIds
      .map((id) => ProjectStorage.load(id))
      .filter((p): p is Project => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first

    setProjects(loadedProjects);
  };

  const deleteProject = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      ProjectStorage.delete(projectId);
      loadProjects();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <Link href="/upload">
            <Button size="lg">
              + New Project
            </Button>
          </Link>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-lg">No projects yet</p>
                <Link href="/upload">
                  <Button>Create Your First Project</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/editor/${project.id}`)}
              >
                <CardHeader>
                  {/* Cover Image or Placeholder */}
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted mb-3">
                    {project.coverImageUrl ? (
                      <img
                        src={project.coverImageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : project.lyrics[0]?.imageUrl ? (
                      <img
                        src={project.lyrics[0].imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-4xl">🎵</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="truncate">{project.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Style:</span>
                      <span className="font-medium text-foreground">
                        {STYLE_TEMPLATES.find(t => t.id === project.styleTemplate)?.name || project.styleTemplate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(project.audioDuration)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lyrics:</span>
                      <span>{project.lyrics.length} phrases</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Images:</span>
                      <span>
                        {project.lyrics.filter((l) => l.imageUrl).length} / {project.lyrics.length}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/editor/${project.id}`);
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="ghost">← Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
