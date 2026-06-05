'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/apiClient';
import { DashboardStatsDTO } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Calendar,
  TrendingUp,
  Activity,
  ArrowRight,
  LogOut,
  User,
  School,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadDashboardStats();
  }, [user, router]);

  const loadDashboardStats = async () => {
    try {
      const result = await apiRequest<DashboardStatsDTO>('/api/dashboard/stats');
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-neutral-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">School Management System</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
              <span className="text-muted-foreground">({user.role})</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h2>
          <p className="text-muted-foreground">Here's what's happening with your school today.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.totalStudents || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enrolled students
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  <School className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.totalTeachers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active teachers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  <BookOpen className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.totalClasses || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Classes across all grades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
                  <FileText className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.activeExams || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ongoing assessments
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Attendance */}
            {stats && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Today's Attendance
                  </CardTitle>
                  <CardDescription>
                    Attendance overview for today
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.todayAttendance.present}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">Present</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {stats.todayAttendance.absent}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">Absent</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <div className="text-2xl font-bold">
                        {stats.todayAttendance.percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Attendance Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Commonly used features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto flex-col space-y-2 py-6"
                    onClick={() => router.push('/dashboard/students')}
                  >
                    <Users className="w-6 h-6" />
                    <span>Students</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col space-y-2 py-6"
                    onClick={() => router.push('/dashboard/teachers')}
                  >
                    <School className="w-6 h-6" />
                    <span>Teachers</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col space-y-2 py-6"
                    onClick={() => router.push('/dashboard/exams')}
                  >
                    <FileText className="w-6 h-6" />
                    <span>Exams</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col space-y-2 py-6"
                    onClick={() => router.push('/dashboard/attendance')}
                  >
                    <Calendar className="w-6 h-6" />
                    <span>Attendance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Exams */}
            {stats && stats.upcomingExams.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Upcoming Exams
                  </CardTitle>
                  <CardDescription>
                    Scheduled assessments for the coming days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.upcomingExams.slice(0, 3).map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{exam.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {exam.subject} • {new Date(exam.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {stats && stats.recentActivities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest actions in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.action}
                            {activity.entity && ` ${activity.entity}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user.name} • {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-neutral-800 mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          © 2024 School Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}