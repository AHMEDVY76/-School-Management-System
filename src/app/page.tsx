'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, BookOpen, Calendar, FileText, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">School Management System</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Complete School Management
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A comprehensive platform for managing students, teachers, classes, exams, schedules, and attendance.
            Built for educational institutions of all sizes.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={() => router.push('/register')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Learn More
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <h3 className="text-3xl font-bold text-center mb-12">Everything You Need</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-4" />
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage students, teachers, and parents with role-based access control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Student profiles & enrollment</li>
                  <li>• Teacher management</li>
                  <li>• Parent accounts</li>
                  <li>• Role-based permissions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Classes & Subjects</CardTitle>
                <CardDescription>
                  Organize classes and assign subjects with flexible scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Class management</li>
                  <li>• Subject organization</li>
                  <li>• Teacher assignments</li>
                  <li>• Capacity tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Exam System</CardTitle>
                <CardDescription>
                  Create exams with MCQ and essay questions, auto-grading included
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• MCQ with auto-grading</li>
                  <li>• Essay questions</li>
                  <li>• Question banks</li>
                  <li>• Result tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Schedule Management</CardTitle>
                <CardDescription>
                  Create and manage timetables with conflict detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Weekly schedules</li>
                  <li>• Conflict prevention</li>
                  <li>• Room assignments</li>
                  <li>• Term management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Attendance Tracking</CardTitle>
                <CardDescription>
                  Track student attendance with detailed reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Daily attendance</li>
                  <li>• Bulk recording</li>
                  <li>• Monthly reports</li>
                  <li>• Status tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GraduationCap className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Comprehensive analytics and insights at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time statistics</li>
                  <li>• Visual charts</li>
                  <li>• Recent activities</li>
                  <li>• Quick actions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-base">
                Join thousands of schools using our platform to streamline their operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={() => router.push('/register')}>
                  Create Account
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 School Management System. All rights reserved.</p>
          <p className="mt-1">Enterprise-grade solution for educational institutions</p>
        </div>
      </footer>
    </div>
  );
}