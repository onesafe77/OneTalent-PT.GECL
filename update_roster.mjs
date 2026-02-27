import fs from 'fs';

const p = 'c:/OneTalent-PT.GECL/client/src/pages/roster.tsx';
let content = fs.readFileSync(p, 'utf-8');

const t1 = `            </Select>

            {/* Shift Filter for Calendar */}`;

const r1 = `            </Select>

            {/* Search by NIK */}
            <Input
              type="text"
              placeholder="Cari NIK..."
              value={searchNIK}
              onChange={(e) => setSearchNIK(e.target.value)}
              className="w-full sm:w-32"
              data-testid="matrix-search-nik-input"
            />

            {/* Search by Name */}
            <Input
              type="text"
              placeholder="Cari Nama/Mitra..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full sm:w-40"
              data-testid="matrix-search-name-input"
            />

            {/* Shift Filter for Calendar */}`;

content = content.replace(t1, r1);
content = content.replace(t1.replace(/\r\n/g, '\n'), r1); // Try LF fallback

const t2 = `        ) : viewMode === 'calendar' ? (
          // Calendar View
          <div className="p-2">
            {isLoadingMonthly ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Loading kalender...
              </div>
            ) : (
              <MonthlyCalendar
                year={selectedYear}
                month={selectedMonth}
                rosterData={monthlyRoster}
                shiftFilter={shiftFilter}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setViewMode('list');
                }}
              />
            )}
          </div>
        ) : (
          // Matrix View
          <div className="p-2">
            {isLoadingMonthly ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Loading matrix...
              </div>
            ) : (
              <RosterMatrixView
                year={selectedYear}
                month={selectedMonth}
                rosterData={monthlyRoster}
                employees={employees}
              />
            )}
          </div>
        )}`;

const r2 = `        ) : (() => {
          // Apply filtering logic to monthlyRoster before passing it to MonthlyCalendar and RosterMatrixView
          const employeeIdsWithShift = new Set(
            shiftFilter === 'all' 
              ? [] 
              : monthlyRoster?.filter(r => r.shift?.toUpperCase() === shiftFilter.toUpperCase()).map(r => r.employeeId)
          );

          const filteredMonthlyRoster = monthlyRoster?.filter(roster => {
            const matchNIK = searchNIK === '' || (roster.employee?.id || '').toLowerCase().includes(searchNIK.toLowerCase());
            const matchName = searchName === '' || 
              (roster.employee?.name || '').toLowerCase().includes(searchName.toLowerCase()) ||
              (roster.employee?.investorGroup || '').toLowerCase().includes(searchName.toLowerCase());
            
            const matchShift = shiftFilter === 'all' || employeeIdsWithShift.has(roster.employeeId);

            return matchNIK && matchName && matchShift;
          }) || [];

          return viewMode === 'calendar' ? (
            // Calendar View
            <div className="p-2">
              {isLoadingMonthly ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading kalender...
                </div>
              ) : (
                <MonthlyCalendar
                  year={selectedYear}
                  month={selectedMonth}
                  rosterData={filteredMonthlyRoster}
                  shiftFilter={shiftFilter}
                  onDateClick={(date) => {
                    setSelectedDate(date);
                    setViewMode('list');
                  }}
                />
              )}
            </div>
          ) : (
            // Matrix View
            <div className="p-2">
              {isLoadingMonthly ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading matrix...
                </div>
              ) : (
                <RosterMatrixView
                  year={selectedYear}
                  month={selectedMonth}
                  rosterData={filteredMonthlyRoster}
                  employees={employees}
                />
              )}
            </div>
          );
        })()}`;

content = content.replace(t2, r2);
content = content.replace(t2.replace(/\r\n/g, '\n'), r2); // Try LF fallback

// Custom replace if exact string matching fails due to subtle spacing
if (!content.includes('employeeIdsWithShift = new Set')) {
    console.log("Fallback matching strategy for t2");
    // find start index
    const startIdx = content.indexOf(`        ) : viewMode === 'calendar' ? (`);
    const endIdx = content.indexOf(`        )}`, startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(0, startIdx) + r2 + content.substring(endIdx + 10);
    }
}

fs.writeFileSync(p, content, 'utf-8');
console.log("Done");
