"use client";
import { DatePicker } from "@ark-ui/react/date-picker";
import { Portal } from "@ark-ui/react/portal";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { parseDate } from "@internationalized/date";

interface DepenzDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export function DepenzDatePicker({ value, onChange }: DepenzDatePickerProps) {
  const parsedValue = value ? [parseDate(value)] : [];

  return (
    <DatePicker.Root
      value={parsedValue}
      onValueChange={(details) => {
        if (details.value.length > 0) {
          const d = details.value[0];
          onChange(
            `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
          );
        }
      }}
      locale="fr-FR"
    >
      <DatePicker.Control className="flex items-center gap-1 rounded-lg border border-[#243552] bg-[#0d1b2a] px-3 py-2 w-full mt-1">
        <DatePicker.Input
          className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
          placeholder="JJ/MM/AAAA"
        />
        <DatePicker.Trigger className="p-1 rounded text-slate-400 hover:text-[#00c896] transition-colors">
          <Calendar size={16} />
        </DatePicker.Trigger>
        <DatePicker.ClearTrigger className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
          <X size={14} />
        </DatePicker.ClearTrigger>
      </DatePicker.Control>

      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content className="mt-2 rounded-xl border border-[#243552] bg-[#1a2d42] shadow-xl p-3 z-[200] w-72">

            <div className="flex gap-2 mb-3">
              <DatePicker.YearSelect className="flex-1 rounded-md border border-[#243552] bg-[#0d1b2a] px-2 py-1 text-sm text-slate-100 outline-none" />
              <DatePicker.MonthSelect className="flex-1 rounded-md border border-[#243552] bg-[#0d1b2a] px-2 py-1 text-sm text-slate-100 outline-none" />
            </div>

            {/* Day view */}
            <DatePicker.View view="day">
              <DatePicker.Context>
                {(dp) => (
                  <>
                    <DatePicker.ViewControl className="flex justify-between items-center mb-2 text-sm text-slate-300">
                      <DatePicker.PrevTrigger className="p-1 rounded hover:bg-[#243552]">
                        <ChevronLeft size={16} />
                      </DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded hover:bg-[#243552] text-slate-200 font-medium">
                        <DatePicker.RangeText />
                      </DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger className="p-1 rounded hover:bg-[#243552]">
                        <ChevronRight size={16} />
                      </DatePicker.NextTrigger>
                    </DatePicker.ViewControl>

                    <DatePicker.Table className="w-full text-center text-sm">
                      <DatePicker.TableHead>
                        <DatePicker.TableRow>
                          {dp.weekDays.map((wd, i) => (
                            <DatePicker.TableHeader key={i} className="py-1 text-xs text-slate-500 font-medium">
                              {wd.short}
                            </DatePicker.TableHeader>
                          ))}
                        </DatePicker.TableRow>
                      </DatePicker.TableHead>
                      <DatePicker.TableBody>
                        {dp.weeks.map((week, i) => (
                          <DatePicker.TableRow key={i}>
                            {week.map((day, j) => (
                              <DatePicker.TableCell key={j} value={day}>
                                <DatePicker.TableCellTrigger className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-[#00c896]/20 hover:text-[#00c896] data-[selected]:bg-[#00c896] data-[selected]:text-[#0d1b2a] data-[selected]:font-bold data-[outside-range]:text-slate-600 data-[today]:border data-[today]:border-[#00c896]/50 transition-colors mx-auto">
                                  {day.day}
                                </DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>

            {/* Month view */}
            <DatePicker.View view="month">
              <DatePicker.Context>
                {(dp) => (
                  <>
                    <DatePicker.ViewControl className="flex justify-between items-center mb-2">
                      <DatePicker.PrevTrigger className="p-1 rounded hover:bg-[#243552] text-slate-300">
                        <ChevronLeft size={16} />
                      </DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded hover:bg-[#243552] text-slate-200 font-medium text-sm">
                        <DatePicker.RangeText />
                      </DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger className="p-1 rounded hover:bg-[#243552] text-slate-300">
                        <ChevronRight size={16} />
                      </DatePicker.NextTrigger>
                    </DatePicker.ViewControl>
                    <DatePicker.Table className="w-full text-sm">
                      <DatePicker.TableBody>
                        {dp.getMonthsGrid({ columns: 4, format: "short" }).map((months, i) => (
                          <DatePicker.TableRow key={i}>
                            {months.map((month, j) => (
                              <DatePicker.TableCell key={j} value={month.value}>
                                <DatePicker.TableCellTrigger className="px-2 py-1.5 rounded-lg text-slate-300 hover:bg-[#00c896]/20 hover:text-[#00c896] data-[selected]:bg-[#00c896] data-[selected]:text-[#0d1b2a] data-[selected]:font-bold transition-colors w-full">
                                  {month.label}
                                </DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>

            {/* Year view */}
            <DatePicker.View view="year">
              <DatePicker.Context>
                {(dp) => (
                  <>
                    <DatePicker.ViewControl className="flex justify-between items-center mb-2">
                      <DatePicker.PrevTrigger className="p-1 rounded hover:bg-[#243552] text-slate-300">
                        <ChevronLeft size={16} />
                      </DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger className="cursor-pointer px-2 py-1 rounded hover:bg-[#243552] text-slate-200 font-medium text-sm">
                        <DatePicker.RangeText />
                      </DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger className="p-1 rounded hover:bg-[#243552] text-slate-300">
                        <ChevronRight size={16} />
                      </DatePicker.NextTrigger>
                    </DatePicker.ViewControl>
                    <DatePicker.Table className="w-full text-sm">
                      <DatePicker.TableBody>
                        {dp.getYearsGrid({ columns: 4 }).map((years, i) => (
                          <DatePicker.TableRow key={i}>
                            {years.map((year, j) => (
                              <DatePicker.TableCell key={j} value={year.value}>
                                <DatePicker.TableCellTrigger className="px-2 py-1.5 rounded-lg text-slate-300 hover:bg-[#00c896]/20 hover:text-[#00c896] data-[selected]:bg-[#00c896] data-[selected]:text-[#0d1b2a] data-[selected]:font-bold transition-colors w-full">
                                  {year.label}
                                </DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>

          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}
