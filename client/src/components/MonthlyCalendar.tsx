import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface RosterSchedule {
  id: string;
  employeeId: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  employee?: {
    id: string;
    name: string;
    nomorLambung?: string;
  };
  hasAttended?: boolean;
  attendanceStatus?: string;
}

interface MonthlyCalendarProps {
  year: number;
  month: number;
  rosterData: RosterSchedule[];
  shiftFilter: string;
  onDateClick?: (date: string) => void;
}

export function MonthlyCalendar({ year, month, rosterData, shiftFilter, onDateClick }: MonthlyCalendarProps) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of month (0 = Minggu, 1 = Senin, etc)
  const firstDayOfWeek = getDay(monthStart);
  const startDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert to Monday-start week
  
  // Group roster by date
  const rosterByDate = rosterData.reduce((acc, roster) => {
    if (!acc[roster.date]) {
      acc[roster.date] = [];
    }
    acc[roster.date].push(roster);
    return acc;
  }, {} as Record<string, RosterSchedule[]>);
  
  // Filter roster by shift
  const filterRostersByShift = (rosters: RosterSchedule[]) => {
    if (shiftFilter === "all") return rosters;
    return rosters.filter(r => r.shift.toLowerCase() === shiftFilter.toLowerCase());
  };
  
  const getDayRoster = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const rosters = rosterByDate[dateStr] || [];
    return filterRostersByShift(rosters);
  };
  
  const getShiftBadgeColor = (shift: string) => {
    if (shift.toLowerCase().includes('shift 1')) {
      return 'bg-blue-500 dark:bg-blue-600 text-white';
    }
    return 'bg-purple-500 dark:bg-purple-600 text-white';
  };
  
  const getAttendanceBadgeColor = (hasAttended: boolean) => {
    return hasAttended 
      ? 'bg-primary dark:bg-primary' 
      : 'bg-red-500 dark:bg-red-600';
  };
  
  return (
    <div className="w-full">
      {/* Calendar Header - Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-sm py-2 bg-gray-100 dark:bg-gray-800 rounded"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startDayOffset }).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[120px]" />
        ))}
        
        {/* Days of the month */}
        {daysInMonth.map((date) => {
          const dayRosters = getDayRoster(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          return (
            <Card
              key={dateStr}
              className={`min-h-[120px] p-2 cursor-pointer hover:shadow-lg transition-shadow ${
                isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              }`}
              onClick={() => onDateClick?.(dateStr)}
              data-testid={`calendar-day-${dateStr}`}
            >
              {/* Date Number */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`text-sm font-bold ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {format(date, 'd')}
                </span>
                {dayRosters.length > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {dayRosters.length}
                  </Badge>
                )}
              </div>
              
              {/* Roster List */}
              <div className="space-y-1 overflow-y-auto max-h-[90px]">
                {dayRosters.slice(0, 3).map((roster) => (
                  <div
                    key={roster.id}
                    className="text-xs p-1 rounded bg-gray-50 dark:bg-gray-800"
                    data-testid={`roster-entry-${roster.id}`}
                  >
                    <div className="flex items-center gap-1">
                      <Badge
                        className={`${getShiftBadgeColor(roster.shift)} text-[10px] px-1 py-0`}
                      >
                        {roster.shift}
                      </Badge>
                      {roster.hasAttended !== undefined && (
                        <div
                          className={`w-2 h-2 rounded-full ${getAttendanceBadgeColor(roster.hasAttended)}`}
                          title={roster.hasAttended ? 'Hadir' : 'Tidak Hadir'}
                        />
                      )}
                    </div>
                    <div className="font-medium truncate mt-0.5">
                      {roster.employee?.nomorLambung || roster.employee?.name || 'N/A'}
                    </div>
                  </div>
                ))}
                
                {/* Show more indicator */}
                {dayRosters.length > 3 && (
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-1">
                    +{dayRosters.length - 3} lagi
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
