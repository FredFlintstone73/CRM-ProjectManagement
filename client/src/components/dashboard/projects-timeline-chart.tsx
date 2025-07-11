import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, BarChart3 } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from "date-fns";
import type { Project } from "@shared/schema";

interface TimelineData {
  period: string;
  count: number;
  projects: Project[];
  color: string;
}

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#87d068', '#ffa500', '#ff6b6b', '#4ecdc4',
  '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7',
  '#a29bfe', '#fd79a8', '#e17055', '#00b894', '#00cec9'
];

interface ProjectsTimelineChartProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export default function ProjectsTimelineChart({ selectedPeriod, onPeriodChange }: ProjectsTimelineChartProps) {
  
  const getPeriodMonths = (period: string) => {
    const now = new Date();
    const start = startOfMonth(now);
    
    switch (period) {
      case "next-1-week":
        return [start]; // Show current month for week view
      case "next-2-weeks":
        return [start]; // Show current month for 2-week view
      case "next-1-month":
        return [start]; // Show current month
      case "next-4-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 3)) });
      case "next-6-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 5)) });
      case "next-12-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 11)) });
      case "next-18-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 17)) });
      case "next-24-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 23)) });
      default:
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 11)) });
    }
  };

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/dashboard/projects-due', selectedPeriod],
    queryFn: async () => {
      const months = getPeriodMonths(selectedPeriod);
      const startDate = months[0];
      const endDate = months[months.length - 1];
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endOfMonth(endDate).toISOString(),
      });
      
      const response = await fetch(`/api/dashboard/projects-due?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects timeline');
      }
      return response.json();
    },
  });

  const chartData: TimelineData[] = getPeriodMonths(selectedPeriod).map((month, index) => {
    const monthProjects = projects?.filter(project => 
      project.dueDate && isSameMonth(new Date(project.dueDate), month)
    ) || [];
    
    return {
      period: format(month, 'MMM yyyy'),
      count: monthProjects.length,
      projects: monthProjects,
      color: CHART_COLORS[index % CHART_COLORS.length]
    };
  });

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-gray-600">
            {data.count} project{data.count !== 1 ? 's' : ''} due
          </p>
          {data.projects.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.projects.slice(0, 3).map((project: Project) => (
                <p key={project.id} className="text-xs text-gray-800">
                  • {project.name}
                </p>
              ))}
              {data.projects.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{data.projects.length - 3} more...
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle>Projects Timeline Distribution</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next-1-week">Next 1 Week</SelectItem>
                <SelectItem value="next-2-weeks">Next 2 Weeks</SelectItem>
                <SelectItem value="next-1-month">Next 1 Month</SelectItem>
                <SelectItem value="next-4-months">Next 4 Months</SelectItem>
                <SelectItem value="next-6-months">Next 6 Months</SelectItem>
                <SelectItem value="next-12-months">Next 12 Months</SelectItem>
                <SelectItem value="next-18-months">Next 18 Months</SelectItem>
                <SelectItem value="next-24-months">Next 24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-center">
                Projects for {selectedPeriod.replace('-', ' ').replace('next', 'next')}
              </h3>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, maxCount + 1]}
                  fontSize={12}
                  label={{ value: 'Number of Projects', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {chartData.filter(d => d.count > 0).map((item, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-4 h-4 rounded mx-auto mb-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="text-xs text-gray-600">{item.period}</div>
                  <div className="text-sm font-semibold">{item.count}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Total Projects:</span>
                  <span className="ml-2">{projects?.length || 0}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Peak Month:</span>
                  <span className="ml-2">
                    {chartData.reduce((prev, curr) => prev.count > curr.count ? prev : curr).period}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Avg per Month:</span>
                  <span className="ml-2">
                    {(chartData.reduce((sum, item) => sum + item.count, 0) / chartData.length).toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Active Months:</span>
                  <span className="ml-2">{chartData.filter(d => d.count > 0).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}