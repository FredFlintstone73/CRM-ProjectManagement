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
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, eachWeekOfInterval, isWithinInterval, differenceInDays, addDays } from "date-fns";
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

// Helper function to detect project type from project name
const getProjectTypeFromName = (projectName: string): string => {
  const name = projectName.toLowerCase();
  if (name.startsWith('frm')) return 'frm';
  if (name.startsWith('im')) return 'im';
  if (name.startsWith('ipu')) return 'ipu';
  if (name.startsWith('csr')) return 'csr';
  if (name.startsWith('gpo')) return 'gpo';
  if (name.startsWith('tar')) return 'tar';
  return 'unknown';
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
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      // Use Monday-based weeks for "This Week" and "This 2 Weeks"
      if (selectedPeriod === "next-1-week") {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      } else if (selectedPeriod === "next-2-weeks") {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      } else if (selectedPeriod === "next-1-month") {
        // For "Next 30 Days", use actual 30-day range from today
        startDate = now;
        endDate = addDays(now, 30);
      } else {
        // For other periods, use the existing month-based logic
        const months = getPeriodMonths(selectedPeriod);
        startDate = months[0];
        endDate = endOfMonth(months[months.length - 1]);
      }
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      const response = await fetch(`/api/dashboard/projects-due?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects timeline');
      }
      return response.json();
    },
  });

  const getChartData = (): TimelineData[] => {
    const now = new Date();
    
    // For "This Week", show Monday through Friday
    if (selectedPeriod === "next-1-week") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({
        start: weekStart,
        end: addWeeks(weekStart, 1) // Get all 7 days but we'll filter to Mon-Fri
      }).slice(0, 5); // Only Monday through Friday
      
      return weekDays.map((day) => {
        const dayProjects = projects?.filter(project => 
          project.dueDate && isSameDay(new Date(project.dueDate), day)
        ) || [];
        
        const projectCounts = {
          frm: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
          im: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
          ipu: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
          csr: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
          gpo: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
          tar: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
        };
        
        return {
          period: format(day, 'EEE'), // Mon, Tue, Wed, Thu, Fri
          ...projectCounts,
          total: dayProjects.length,
          projects: dayProjects,
        };
      });
    }
    
    // For "This 2 Weeks", show all days from Monday to next Friday (10 days total)
    if (selectedPeriod === "next-2-weeks") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const twoWeeksEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({
        start: weekStart,
        end: twoWeeksEnd
      }).filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday (1) through Friday (5)
      });
      
      return allDays.map((day) => {
        const dayProjects = projects?.filter(project => 
          project.dueDate && isSameDay(new Date(project.dueDate), day)
        ) || [];
        
        const projectCounts = {
          frm: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
          im: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
          ipu: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
          csr: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
          gpo: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
          tar: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
        };
        
        return {
          period: format(day, 'EEE M/d'), // Mon 7/15, Tue 7/16, etc.
          ...projectCounts,
          total: dayProjects.length,
          projects: dayProjects,
        };
      });
    }
    
    // For "Next 30 Days", show Week 1, Week 2, Week 3, Week 4
    if (selectedPeriod === "next-1-month") {
      const thirtyDaysEnd = addDays(now, 30);
      
      // Debug: let's see what weeks we're generating
      console.log('Timeline Chart Debug - Next 30 Days:', {
        now: now.toISOString(),
        thirtyDaysEnd: thirtyDaysEnd.toISOString(),
        startForWeeks: now.toISOString(),
        endForWeeks: thirtyDaysEnd.toISOString()
      });
      
      // Get all weeks and limit to exactly 5 weeks max for 30-day period
      const allWeeks = eachWeekOfInterval(
        { start: now, end: thirtyDaysEnd },
        { weekStartsOn: 1 } // Monday = 1
      );
      
      console.log('All weeks generated:', allWeeks.map(w => w.toISOString()));
      
      // For 30 days from July 21, we should only have 5 weeks max
      const weeks = allWeeks.slice(0, 5);
      
      return weeks.map((weekStart, index) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekProjects = projects?.filter(project => {
          if (!project.dueDate) return false;
          const projectDate = new Date(project.dueDate);
          return isWithinInterval(projectDate, { start: weekStart, end: weekEnd });
        }) || [];
        
        const projectCounts = {
          frm: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
          im: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
          ipu: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
          csr: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
          gpo: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
          tar: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
        };
        
        return {
          period: `Week ${index + 1}`,
          ...projectCounts,
          total: weekProjects.length,
          projects: weekProjects,
        };
      });
    }
    
    // For "Custom Date Range", use dynamic formatting based on range duration
    if (selectedPeriod === "custom-range" && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const daysDifference = differenceInDays(endDate, startDate);
      
      // Less than 15 days: show by days
      if (daysDifference < 15) {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        return days.map((day) => {
          const dayProjects = projects?.filter(project => 
            project.dueDate && isSameDay(new Date(project.dueDate), day)
          ) || [];
          
          const projectCounts = {
            frm: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
            im: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
            ipu: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
            csr: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
            gpo: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
            tar: dayProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
          };
          
          return {
            period: format(day, 'EEE M/d'),
            ...projectCounts,
            total: dayProjects.length,
            projects: dayProjects,
          };
        });
      }
      
      // Less than 50 days: show by weeks
      if (daysDifference < 50) {
        const weeks = eachWeekOfInterval(
          { start: startDate, end: endDate },
          { weekStartsOn: 1 }
        );
        
        return weeks.map((weekStart, index) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekProjects = projects?.filter(project => {
            if (!project.dueDate) return false;
            const projectDate = new Date(project.dueDate);
            return isWithinInterval(projectDate, { start: weekStart, end: weekEnd });
          }) || [];
          
          const projectCounts = {
            frm: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
            im: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
            ipu: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
            csr: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
            gpo: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
            tar: weekProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
          };
          
          return {
            period: format(weekStart, 'M/d'),
            ...projectCounts,
            total: weekProjects.length,
            projects: weekProjects,
          };
        });
      }
      
      // 50+ days: show by months
      const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
      return months.map((month, index) => {
        const monthProjects = projects?.filter(project => 
          project.dueDate && isSameMonth(new Date(project.dueDate), month)
        ) || [];
        
        const projectCounts = {
          frm: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
          im: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
          ipu: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
          csr: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
          gpo: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
          tar: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
        };
        
        return {
          period: format(month, 'MMM yyyy'),
          ...projectCounts,
          total: monthProjects.length,
          projects: monthProjects,
        };
      });
    }
    
    // For other periods, use the existing month-based logic
    const months = getPeriodMonths(selectedPeriod);
    return months.map((month, index) => {
      const monthProjects = projects?.filter(project => 
        project.dueDate && isSameMonth(new Date(project.dueDate), month)
      ) || [];
      
      const projectCounts = {
        frm: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'frm').length,
        im: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'im').length,
        ipu: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'ipu').length,
        csr: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'csr').length,
        gpo: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'gpo').length,
        tar: monthProjects.filter(p => getProjectTypeFromName(p.name) === 'tar').length,
      };
      
      return {
        period: format(month, 'MMM yyyy'),
        ...projectCounts,
        total: monthProjects.length,
        projects: monthProjects,
      };
    });
  };

  const chartData = getChartData();

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
                <SelectItem value="next-1-week">This Week</SelectItem>
                <SelectItem value="next-2-weeks">This 2 Weeks</SelectItem>
                <SelectItem value="next-1-month">Next 30 Days</SelectItem>
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
            
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
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
                  allowDecimals={false}
                  tickCount={Math.max(5, maxCount + 1)}
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

            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-[18px]">
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