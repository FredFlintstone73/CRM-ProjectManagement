import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, BarChart3, CalendarDays } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from "date-fns";
import type { Project } from "@shared/schema";

interface TimelineData {
  period: string;
  frm: number;
  im: number;
  ipu: number;
  csr: number;
  gpo: number;
  tar: number;
  total: number;
  projects: Project[];
}

const PROJECT_TYPE_COLORS = {
  frm: '#10B981', // Green - Financial Road Map Interview
  im: '#EAB308',  // Yellow - Implementation Meeting
  ipu: '#F97316', // Orange - Initial Progress Update
  csr: '#EF4444', // Red - Comprehensive Safety Review
  gpo: '#8B5CF6', // Purple - Goals Progress Update
  tar: '#3B82F6'  // Blue - The Annual Review
};

const PROJECT_TYPE_LABELS = {
  frm: 'FRM',
  im: 'IM',
  ipu: 'IPU',
  csr: 'CSR',
  gpo: 'GPO',
  tar: 'TAR'
};

interface ProjectsTimelineChartProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (startDate: string, endDate: string) => void;
}

export default function ProjectsTimelineChart({ 
  selectedPeriod, 
  onPeriodChange, 
  customStartDate, 
  customEndDate, 
  onCustomDateChange 
}: ProjectsTimelineChartProps) {
  const [tempStartDate, setTempStartDate] = useState(customStartDate || format(new Date(), 'yyyy-MM-dd'));
  const [tempEndDate, setTempEndDate] = useState(customEndDate || format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  
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
      case "next-12-months":
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 11)) });
      case "custom-range":
        const customStart = customStartDate ? new Date(customStartDate) : start;
        const customEnd = customEndDate ? new Date(customEndDate) : addMonths(start, 3);
        return eachMonthOfInterval({ start: startOfMonth(customStart), end: endOfMonth(customEnd) });
      default:
        return eachMonthOfInterval({ start, end: endOfMonth(addMonths(start, 3)) });
    }
  };

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/dashboard/projects-due', selectedPeriod, customStartDate, customEndDate],
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
    
    const projectCounts = {
      frm: monthProjects.filter(p => p.projectType === 'frm').length,
      im: monthProjects.filter(p => p.projectType === 'im').length,
      ipu: monthProjects.filter(p => p.projectType === 'ipu').length,
      csr: monthProjects.filter(p => p.projectType === 'csr').length,
      gpo: monthProjects.filter(p => p.projectType === 'gpo').length,
      tar: monthProjects.filter(p => p.projectType === 'tar').length,
    };
    
    return {
      period: format(month, 'MMM yyyy'),
      ...projectCounts,
      total: monthProjects.length,
      projects: monthProjects,
    };
  });

  const maxCount = Math.max(...chartData.map(d => d.total), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-gray-600">
            {data.total} meeting{data.total !== 1 ? 's' : ''} scheduled
          </p>
          <div className="mt-2 space-y-1">
            {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => {
              const count = data[key];
              if (count > 0) {
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: PROJECT_TYPE_COLORS[key as keyof typeof PROJECT_TYPE_COLORS] }}
                    />
                    <span>{label}: {count}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
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
            <CardTitle>Upcoming Progress Meetings</CardTitle>
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
                <SelectItem value="next-12-months">Next 12 Months</SelectItem>
                <SelectItem value="custom-range">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
            {selectedPeriod === "custom-range" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Set Dates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Custom Date Range</h4>
                      <p className="text-sm text-muted-foreground">
                        Select your custom start and end dates
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="col-span-2 h-8"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        if (onCustomDateChange) {
                          onCustomDateChange(tempStartDate, tempEndDate);
                        }
                      }}
                      className="w-full"
                    >
                      Apply Date Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
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
                Meeting Types for {selectedPeriod.replace('-', ' ').replace('next', 'next')}
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
                  fontSize={14}
                  fontWeight="bold"
                />
                <YAxis 
                  domain={[0, maxCount + 1]}
                  fontSize={12}
                  label={{ value: 'Number of Meetings', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="frm" stackId="a" fill={PROJECT_TYPE_COLORS.frm} />
                <Bar dataKey="im" stackId="a" fill={PROJECT_TYPE_COLORS.im} />
                <Bar dataKey="ipu" stackId="a" fill={PROJECT_TYPE_COLORS.ipu} />
                <Bar dataKey="csr" stackId="a" fill={PROJECT_TYPE_COLORS.csr} />
                <Bar dataKey="gpo" stackId="a" fill={PROJECT_TYPE_COLORS.gpo} />
                <Bar dataKey="tar" stackId="a" fill={PROJECT_TYPE_COLORS.tar} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="text-center">
                  <div 
                    className="w-4 h-4 rounded mx-auto mb-1"
                    style={{ backgroundColor: PROJECT_TYPE_COLORS[key as keyof typeof PROJECT_TYPE_COLORS] }}
                  />
                  <div className="text-gray-600 font-bold text-[18px]">{label}</div>
                  <div className="font-semibold text-[18px]">
                    {chartData.reduce((sum, item) => sum + (item[key as keyof TimelineData] as number), 0)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-[18px]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Total Meetings:</span>
                  <span className="ml-2">{projects?.length || 0}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Peak Month:</span>
                  <span className="ml-2">
                    {chartData.reduce((prev, curr) => prev.total > curr.total ? prev : curr).period}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Avg per Month:</span>
                  <span className="ml-2">
                    {(chartData.reduce((sum, item) => sum + item.total, 0) / chartData.length).toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Active Months:</span>
                  <span className="ml-2">{chartData.filter(d => d.total > 0).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}