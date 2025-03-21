import React, { useState, useEffect, useMemo } from 'react';

const HotelDashboard = () => {
  // State variables
  const [viewType, setViewType] = useState('daily'); // daily, weekly, monthly
  const [roomType, setRoomType] = useState('all'); // all, standard, deluxe, suite, executive, family
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeClosedRooms, setIncludeClosedRooms] = useState(false);
  const [revIncludesTax, setRevIncludesTax] = useState(false);
  const [selectedGuestList, setSelectedGuestList] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(1);
  const [calendarYear, setCalendarYear] = useState(2025);
  const [scrollPosition, setScrollPosition] = useState(0); // New state to track scroll position
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    day: true,
    availableRooms: true,
    soldRooms: true,
    guests: true,
    occupancyPercentage: true,
    revPAR: false, // Hidden by default
    adr: false,    // Hidden by default
    revenue: false, // Hidden by default
    unavailableRooms: false // Added new column, hidden by default
  });
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({
    available: 0,
    occupied: 0,
    occupancyPercentage: '0.0',
    revPAR: '0.00',
    adr: '0.00',
    revenue: '0.00',
    guests: 0
  });
  const [reportRun, setReportRun] = useState(false);
  
  // Room types data
  const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Family'];
  
  // Room type configurations
  const roomTypeConfig = {
    Standard: { minGuests: 1, maxGuests: 2, baseRate: 189, floorStart: 1, rooms: 4 },
    Deluxe: { minGuests: 1, maxGuests: 3, baseRate: 229, floorStart: 2, rooms: 4 },
    Suite: { minGuests: 2, maxGuests: 4, baseRate: 299, floorStart: 3, rooms: 4 },
    Executive: { minGuests: 2, maxGuests: 4, baseRate: 359, floorStart: 4, rooms: 4 },
    Family: { minGuests: 2, maxGuests: 6, baseRate: 399, floorStart: 5, rooms: 4 }
  };
  
  // Available months and years for date selection
  const dateOptions = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
    return { months, years, days };
  }, []);
  
  // Utility functions for date handling
  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split(' ');
    return new Date(year, getMonthNumber(month), parseInt(day));
  };

  const getMonthNumber = (monthStr) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthStr];
  };

  // Function to format date object to string format (DD MMM YYYY)
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    return `${day} ${month} ${date.getFullYear()}`;
  };

  // Function to handle date selection from calendar
  const handleDateSelect = (type, dateObj) => {
    const formattedDate = formatDate(dateObj);
    if (type === 'from') {
      setDateFrom(formattedDate);
      setShowFromCalendar(false);
    } else {
      setDateTo(formattedDate);
      setShowToCalendar(false);
    }
  };

  // Function to get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Function to get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Function to navigate previous month
  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  // Function to navigate next month
  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // Function to set calendar to today
  const goToToday = () => {
    const today = new Date();
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  const getDaysInRange = (startDate, endDate, weekStart, weekEnd) => {
    const start = new Date(Math.max(startDate.getTime(), weekStart.getTime()));
    const end = new Date(Math.min(endDate.getTime(), weekEnd.getTime()));
    
    if (end < start) return 0;
    
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };
  
  // State for closed rooms data
  const [closedRooms, setClosedRooms] = useState([
    { roomId: 5, roomType: 'Standard', reason: 'Maintenance', startDate: '01 Feb 2025', endDate: '10 Feb 2025' },
    { roomId: 12, roomType: 'Deluxe', reason: 'Renovation', startDate: '05 Feb 2025', endDate: '20 Feb 2025' },
    { roomId: 17, roomType: 'Suite', reason: 'Water Damage', startDate: '15 Feb 2025', endDate: '28 Feb 2025' }
  ]);
  
  // Generate dates for February 2025
  const dates = useMemo(() => {
    const datesArray = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 1; i <= 28; i++) {
      const date = new Date(2025, 1, i); // February is 1 (0-indexed months)
      datesArray.push({
        date: `${i.toString().padStart(2, '0')} Feb 2025`,
        day: days[date.getDay()]
      });
    }
    return datesArray;
  }, []);

  // Helper function to count unavailable rooms on a specific date
  const getUnavailableRoomCount = (date, selectedRoomType = 'all') => {
    if (!includeClosedRooms) return 0;
    
    const dateObj = typeof date === 'string' ? parseDate(date) : date;
    let unavailableCount = 0;
    
    closedRooms.forEach(room => {
      const startDate = parseDate(room.startDate);
      const endDate = parseDate(room.endDate);
      
      if (dateObj >= startDate && dateObj <= endDate) {
        if (selectedRoomType === 'all' || selectedRoomType === room.roomType.toLowerCase()) {
          unavailableCount++;
        }
      }
    });
    
    // Log for debugging when dates match our closed room periods
    const formattedDate = formatDate(dateObj);
    if (unavailableCount > 0) {
      console.log(`Date ${formattedDate} has ${unavailableCount} unavailable rooms of type ${selectedRoomType}`);
    }
    
    return unavailableCount;
  };
  
  // Generate mock data for daily view
  const generateDailyData = () => {
    console.log("Generating daily data with room type:", roomType);
    let filteredRooms = 20;
    if (roomType !== 'all') {
      filteredRooms = 4; // 4 rooms per type
    }
    
    const seedRandom = (seed) => {
      return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    };
    
    const random = seedRandom(123);
    
    // Parse date range
    const startDate = dateFrom ? parseDate(dateFrom) : null;
    const endDate = dateTo ? parseDate(dateTo) : null;
    
    // If no dates are selected, return empty array
    if (!startDate || !endDate) {
      return [];
    }
    
    // Generate dates for the selected range
    const datesArray = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Clone the start date to avoid modifying the original
    const currentDate = new Date(startDate);
    
    // Iterate through each day in the selected range
    while (currentDate <= endDate) {
      const day = days[currentDate.getDay()];
      const formattedDate = formatDate(currentDate);
      
      datesArray.push({
        date: formattedDate,
        day: day,
        dateObj: new Date(currentDate) // Keep a copy of the date object for calculations
      });
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generate data for each day
    return datesArray.map((dateObj, index) => {
      const unavailableRooms = getUnavailableRoomCount(dateObj.dateObj, roomType);
      const adjustedAvailableRooms = filteredRooms - unavailableRooms;
      
      const isWeekend = dateObj.day === 'Saturday' || dateObj.day === 'Sunday';
      const randomOccupancy = Math.floor(random() * (adjustedAvailableRooms + 1));
      
      // Calculate total guests first to ensure consistency
      let totalGuests = 0;
      const guestDetails = [];
      
      // Generate guest details ensuring the total matches what we'll show in the table
      for (let i = 0; i < randomOccupancy; i++) {
        const selectedRoomType = roomType !== 'all' ? 
          roomType.charAt(0).toUpperCase() + roomType.slice(1) : 
          roomTypes[Math.floor(random() * roomTypes.length)];
        
        const config = roomTypeConfig[selectedRoomType];
        const roomNumber = (config.floorStart * 100) + (Math.floor(random() * config.rooms) + 1);
        
        // Calculate number of guests for this room within room type limits
        const minGuests = config.minGuests;
        const maxGuests = config.maxGuests;
        const roomGuests = Math.floor(random() * (maxGuests - minGuests + 1)) + minGuests;
        
        const checkInDate = new Date(dateObj.dateObj);
        checkInDate.setDate(checkInDate.getDate() - Math.floor(random() * 3));
        
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + Math.floor(random() * 5) + 1);
        
        const formatDate = (date) => {
          return `${date.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]} ${date.getFullYear()}`;
        };
        
        const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'Robert', 'Lisa'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'];
        
        const primaryGuest = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        
        // Generate all guests for the room
        const allGuests = [];
        let remainingGuests = roomGuests;
        
        // Always add primary guest as an adult
        allGuests.push({
          name: primaryGuest,
          age: Math.floor(random() * 40) + 25, // Adult age 25-65
          type: 'adult'
        });
        remainingGuests--;
        
        // Add remaining guests
        while (remainingGuests > 0) {
          const isChild = remainingGuests > 1 && random() > 0.7; // Children only if there's room for an adult
          const guestName = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
          const age = isChild ? Math.floor(random() * 17) + 1 : Math.floor(random() * 40) + 25;
          
          allGuests.push({
            name: guestName,
            age,
            type: isChild ? 'child' : 'adult'
          });
          remainingGuests--;
        }
        
        totalGuests += allGuests.length;
        
        const notes = random() > 0.7 ? 
          ['Allergic to nuts', 'Requires extra pillows', 'Prefers high floor', 'Celebrating anniversary'][Math.floor(random() * 4)] : 
          null;
        
        guestDetails.push({
          id: `guest-${index}-${i}`,
          room: `${roomNumber}`,
          roomType: selectedRoomType,
          primaryGuest,
          allGuests,
          checkIn: formatDate(checkInDate),
          checkOut: formatDate(checkOutDate),
          phone: `+1 ${Math.floor(random() * 900) + 100}-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 9000) + 1000}`,
          notes
        });
      }
      
      // Calculate revenue and other metrics
      const baseRate = isWeekend ? 220 : 189;
      const rate = roomType !== 'all' ? 
        baseRate * (1 + roomTypes.indexOf(roomType.charAt(0).toUpperCase() + roomType.slice(1)) * 0.15) : 
        baseRate;
      
      const revenue = rate * randomOccupancy * (revIncludesTax ? 1.1 : 1);
      const occupancyPercentage = adjustedAvailableRooms > 0 ? (randomOccupancy / adjustedAvailableRooms) * 100 : 0;
      const revPAR = adjustedAvailableRooms > 0 ? revenue / adjustedAvailableRooms : 0;
      const adr = randomOccupancy > 0 ? revenue / randomOccupancy : 0;
      
      return {
        date: dateObj.date,
        day: dateObj.day,
        availableRooms: adjustedAvailableRooms,
        soldRooms: randomOccupancy,
        guests: totalGuests,
        occupancyPercentage: occupancyPercentage.toFixed(1),
        revPAR: revPAR.toFixed(2),
        adr: adr.toFixed(2),
        revenue: revenue.toFixed(2),
        unavailableRooms: unavailableRooms,
        guestDetails
      };
    });
  };
  
  // Generate mock data for weekly view with date range handling
  const generateWeeklyData = () => {
    console.log("Generating weekly data with room type:", roomType);
    const startDate = parseDate(dateFrom);
    const endDate = parseDate(dateTo);
    
    // If no dates are selected, return empty array
    if (!startDate || !endDate) {
      return [];
    }
    
    // Find the first Sunday before or on the start date
    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());
    
    // Generate week boundaries starting from the first Sunday
    const weekBoundaries = [];
    let currentWeekStart = new Date(firstSunday);
    
    while (currentWeekStart <= endDate) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const weekStartStr = `${currentWeekStart.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;
      const weekEndStr = `${currentWeekEnd.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentWeekEnd.getMonth()]} ${currentWeekEnd.getFullYear()}`;
      
      weekBoundaries.push({
        start: new Date(currentWeekStart),
        end: new Date(currentWeekEnd),
        label: `${weekStartStr} - ${weekEndStr}`
      });
      
      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    const roomsPerType = roomType === 'all' ? 20 : 4;
    
    // Use a fixed seed for random number generation
    const seedRandom = (seed) => {
      return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    };
    
    const random = seedRandom(456);
    const weeklyData = [];
    
    for (const week of weekBoundaries) {
      const daysInRange = getDaysInRange(startDate, endDate, week.start, week.end);
      
      if (daysInRange === 0) {
        continue; // Skip weeks that don't overlap with the selected date range
      }
      
      // Calculate average unavailable rooms for this week
      let totalUnavailableRoomNights = 0;
      for (let d = new Date(week.start); d <= week.end; d.setDate(d.getDate() + 1)) {
        if (d >= startDate && d <= endDate) {
          totalUnavailableRoomNights += getUnavailableRoomCount(d, roomType);
        }
      }
      
      const avgUnavailableRoomsPerDay = daysInRange > 0 ? totalUnavailableRoomNights / daysInRange : 0;
      const adjustedAvailableRoomNights = (roomsPerType - avgUnavailableRoomsPerDay) * daysInRange;
      
      // Variable occupancy rates based on week (higher on weekends, etc.)
      const weekIndex = weekBoundaries.indexOf(week);
      const baseOccupancies = [0.72, 0.78, 0.68, 0.82, 0.75];
      const variability = 0.05; // Add some randomness
      const occupancyRate = Math.min(0.95, Math.max(0.5, 
        baseOccupancies[weekIndex % baseOccupancies.length] + (random() * variability * 2 - variability)
      ));
      
      const soldRoomNights = Math.round(adjustedAvailableRoomNights * occupancyRate);
      const guestsTotal = Math.floor(soldRoomNights * 1.6);
      
      // Variable ADR based on demand
      const baseADR = 250;
      const weeklyAdjustment = weekIndex % 4 === 1 ? 20 : (weekIndex % 4 === 2 ? -15 : 5); // Higher on second week, lower on third
      const seasonalADR = baseADR + weeklyAdjustment;
      
      const adr = seasonalADR + (occupancyRate > 0.8 ? 15 : 0); // Higher ADR when occupancy is high (demand pricing)
      
      const baseRevenue = Math.round(adr * soldRoomNights);
      const revenue = revIncludesTax ? baseRevenue * 1.1 : baseRevenue;
      const revPAR = adjustedAvailableRoomNights > 0 ? 
        (revenue / adjustedAvailableRoomNights).toFixed(2) : '0.00';
      
      const weekLabel = daysInRange < 7 ? 
        `${week.label} (${daysInRange} days)` : week.label;
      
      // Generate weekly guest details
      const guestDetails = [];
      
      // Generate sample guest details for the week
      const numberOfGuests = Math.min(20, guestsTotal); // Limit to 20 guests for performance
      const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'Robert', 'Lisa'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'];
      
      for (let i = 0; i < numberOfGuests; i++) {
        const selectedRoomType = roomType !== 'all' ? 
          roomType.charAt(0).toUpperCase() + roomType.slice(1) : 
          roomTypes[Math.floor(random() * roomTypes.length)];
        
        const config = roomTypeConfig[selectedRoomType];
        const roomNumber = (config.floorStart * 100) + (Math.floor(random() * config.rooms) + 1);
        
        // Calculate checkIn and checkOut dates within the week
        const dayOffset = Math.floor(random() * daysInRange);
        const checkInDate = new Date(week.start);
        checkInDate.setDate(checkInDate.getDate() + dayOffset);
        
        const stayLength = Math.floor(random() * 5) + 1;
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + stayLength);
        
        const formatDate = (date) => {
          return `${date.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]} ${date.getFullYear()}`;
        };
        
        const primaryGuest = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
        
        // Generate all guests for the room
        const allGuests = [];
        const roomGuests = Math.floor(random() * (config.maxGuests - config.minGuests + 1)) + config.minGuests;
        let remainingGuests = roomGuests;
        
        // Always add primary guest as an adult
        allGuests.push({
          name: primaryGuest,
          age: Math.floor(random() * 40) + 25, // Adult age 25-65
          type: 'adult'
        });
        remainingGuests--;
        
        // Add remaining guests
        while (remainingGuests > 0) {
          const isChild = remainingGuests > 1 && random() > 0.7; // Children only if there's room for an adult
          const guestName = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
          const age = isChild ? Math.floor(random() * 17) + 1 : Math.floor(random() * 40) + 25;
          
          allGuests.push({
            name: guestName,
            age,
            type: isChild ? 'child' : 'adult'
          });
          remainingGuests--;
        }
        
        const notes = random() > 0.7 ? 
          ['Allergic to nuts', 'Requires extra pillows', 'Prefers high floor', 'Celebrating anniversary'][Math.floor(random() * 4)] : 
          null;
        
        guestDetails.push({
          id: `week-guest-${weekIndex}-${i}`,
          room: `${roomNumber}`,
          roomType: selectedRoomType,
          primaryGuest,
          allGuests,
          checkIn: formatDate(checkInDate),
          checkOut: formatDate(checkOutDate),
          phone: `+1 ${Math.floor(random() * 900) + 100}-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 9000) + 1000}`,
          notes
        });
      }
      
      weeklyData.push({
        period: weekLabel,
        availableRooms: Math.round(adjustedAvailableRoomNights),
        soldRooms: soldRoomNights,
        guests: guestsTotal,
        occupancyPercentage: adjustedAvailableRoomNights > 0 ?
          ((soldRoomNights / adjustedAvailableRoomNights) * 100).toFixed(1) : '0.0',
        revPAR,
        adr: adr.toFixed(2),
        revenue: revenue.toFixed(2),
        guestDetails
      });
    }
    
    return weeklyData;
  };

  // Generate mock data for monthly view with date range handling
  const generateMonthlyData = () => {
    console.log("Generating monthly data with room type:", roomType);
    // Parse date range
    const startDate = parseDate(dateFrom);
    const endDate = parseDate(dateTo);
    
    // If no dates are selected, return empty array
    if (!startDate || !endDate) {
      return [];
    }
    
    // Get the first day of the start month and the last day of the end month
    const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    
    // Generate list of months in range
    const months = [];
    let currentMonth = new Date(startMonth);
    
    while (currentMonth <= endMonth) {
      const monthYear = currentMonth.getFullYear();
      const monthIndex = currentMonth.getMonth();
      const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'][monthIndex];
      
      // Calculate first and last day of month that falls within date range
      const monthStart = new Date(Math.max(startDate.getTime(), new Date(monthYear, monthIndex, 1).getTime()));
      const monthEnd = new Date(Math.min(endDate.getTime(), new Date(monthYear, monthIndex + 1, 0).getTime()));
      
      // Calculate days in the month that fall within the date range
      const daysInMonth = getDaysInRange(monthStart, monthEnd, monthStart, monthEnd);
      
      if (daysInMonth > 0) {
        // Calculate average unavailable rooms
        let totalUnavailableRoomNights = 0;
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          totalUnavailableRoomNights += getUnavailableRoomCount(d, roomType);
        }
        
        const avgUnavailableRoomsPerDay = daysInMonth > 0 ? totalUnavailableRoomNights / daysInMonth : 0;
        const adjustedAvailableRoomNights = (roomType === 'all' ? 20 : 4) * daysInMonth - totalUnavailableRoomNights;
        
        // Variable occupancy rates for different months
        const occupancyRates = {
          0: 0.65, // January
          1: 0.775, // February
          2: 0.71, // March
          3: 0.68, // April
          4: 0.72, // May
          5: 0.82, // June
          6: 0.88, // July
          7: 0.90, // August
          8: 0.76, // September
          9: 0.69, // October
          10: 0.72, // November
          11: 0.88, // December
        };
        
        const occupancyRate = occupancyRates[monthIndex] || 0.75;
        const soldRoomNights = Math.round(adjustedAvailableRoomNights * occupancyRate);
        const guestsTotal = Math.floor(soldRoomNights * 1.6);
        
        // Variable ADR for different months
        const monthlyADRs = {
          0: 230.50, // January
          1: 257.66, // February
          2: 245.80, // March
          3: 235.20, // April
          4: 252.50, // May
          5: 275.30, // June
          6: 290.80, // July
          7: 298.50, // August
          8: 268.75, // September
          9: 245.90, // October
          10: 252.40, // November
          11: 310.25, // December
        };
        
        const adr = monthlyADRs[monthIndex] || 250.00;
        
        const baseRevenue = (adr * soldRoomNights);
        const revenue = (revIncludesTax ? baseRevenue * 1.1 : baseRevenue).toFixed(2);
        const revPAR = ((revenue / adjustedAvailableRoomNights).toFixed(2));
        
        const isPartialMonth = daysInMonth < new Date(monthYear, monthIndex + 1, 0).getDate();
        const periodLabel = isPartialMonth 
          ? `${monthName} ${monthYear} (${daysInMonth} days)` 
          : `${monthName} ${monthYear}`;
        
        // Generate monthly guest details
        const guestDetails = [];
        const seedRandom = (seed) => {
          return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
          };
        };
        
        const random = seedRandom(789 + monthIndex);
        
        // Generate sample guest details for the month
        const numberOfGuests = Math.min(30, guestsTotal); // Limit to 30 guests for performance
        const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'Robert', 'Lisa', 'Thomas', 'Emily'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Clark'];
        
        for (let i = 0; i < numberOfGuests; i++) {
          const selectedRoomType = roomType !== 'all' ? 
            roomType.charAt(0).toUpperCase() + roomType.slice(1) : 
            roomTypes[Math.floor(random() * roomTypes.length)];
          
          const config = roomTypeConfig[selectedRoomType];
          const roomNumber = (config.floorStart * 100) + (Math.floor(random() * config.rooms) + 1);
          
          // Calculate checkIn and checkOut dates within the month
          const dayOffset = Math.floor(random() * daysInMonth);
          const checkInDate = new Date(monthStart);
          checkInDate.setDate(checkInDate.getDate() + dayOffset);
          
          const stayLength = Math.floor(random() * 7) + 1;
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + stayLength);
          
          const formatDate = (date) => {
            return `${date.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]} ${date.getFullYear()}`;
          };
          
          const primaryGuest = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
          
          // Generate all guests for the room
          const allGuests = [];
          const roomGuests = Math.floor(random() * (config.maxGuests - config.minGuests + 1)) + config.minGuests;
          let remainingGuests = roomGuests;
          
          // Always add primary guest as an adult
          allGuests.push({
            name: primaryGuest,
            age: Math.floor(random() * 40) + 25, // Adult age 25-65
            type: 'adult'
          });
          remainingGuests--;
          
          // Add remaining guests
          while (remainingGuests > 0) {
            const isChild = remainingGuests > 1 && random() > 0.7; // Children only if there's room for an adult
            const guestName = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
            const age = isChild ? Math.floor(random() * 17) + 1 : Math.floor(random() * 40) + 25;
            
            allGuests.push({
              name: guestName,
              age,
              type: isChild ? 'child' : 'adult'
            });
            remainingGuests--;
          }
          
          const notes = random() > 0.7 ? 
            ['Allergic to nuts', 'Requires extra pillows', 'Prefers high floor', 'Celebrating anniversary', 'Business traveler', 'Frequent guest'][Math.floor(random() * 6)] : 
            null;
          
          guestDetails.push({
            id: `month-guest-${monthIndex}-${i}`,
            room: `${roomNumber}`,
            roomType: selectedRoomType,
            primaryGuest,
            allGuests,
            checkIn: formatDate(checkInDate),
            checkOut: formatDate(checkOutDate),
            phone: `+1 ${Math.floor(random() * 900) + 100}-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 9000) + 1000}`,
            notes
          });
        }
        
        months.push({
          period: periodLabel,
          availableRooms: Math.round(adjustedAvailableRoomNights),
          soldRooms: soldRoomNights,
          guests: guestsTotal,
          occupancyPercentage: ((soldRoomNights / adjustedAvailableRoomNights) * 100).toFixed(1),
          revPAR,
          adr: adr.toFixed(2),
          revenue,
          guestDetails
        });
      }
      
      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return months;
  };

  // Get data based on current view type
  const getData = () => {
    // Make sure to use the current state values
    switch(viewType) {
      case 'daily':
        return generateDailyData();
      case 'weekly':
        return generateWeeklyData();
      case 'monthly':
        return generateMonthlyData();
      default:
        return generateDailyData();
    }
  };
  
  // Calculate summary
  const calculateSummary = (dataToSummarize) => {
    const totalAvailable = dataToSummarize.reduce((sum, item) => {
      return sum + item.availableRooms;
    }, 0);
    
    const totalOccupied = dataToSummarize.reduce((sum, item) => {
      return sum + item.soldRooms;
    }, 0);
    
    const totalRevenue = dataToSummarize.reduce((sum, item) => {
      return sum + parseFloat(item.revenue);
    }, 0);
    
    const totalGuests = dataToSummarize.reduce((sum, item) => {
      return sum + item.guests;
    }, 0);
    
    // Calculate total unavailable rooms
    const totalUnavailableRooms = dataToSummarize.reduce((sum, item) => {
      return sum + (item.unavailableRooms || 0);
    }, 0);
    
    const avgOccupancy = totalAvailable > 0 ? (totalOccupied / totalAvailable) * 100 : 0;
    
    const avgRevPAR = totalAvailable > 0 ? totalRevenue / totalAvailable : 0;
    
    const avgADR = totalOccupied > 0 ? totalRevenue / totalOccupied : 0;
    
    return {
      available: totalAvailable,
      occupied: totalOccupied,
      occupancyPercentage: avgOccupancy.toFixed(1),
      revPAR: avgRevPAR.toFixed(2),
      adr: avgADR.toFixed(2),
      revenue: totalRevenue.toFixed(2),
      guests: totalGuests,
      unavailableRooms: totalUnavailableRooms
    };
  };
  
  // Update data when relevant inputs change - removed automatic data loading on mount
  useEffect(() => {
    // No automatic data loading on mount
    // Data will only be loaded when user clicks "Run Report"
  }, []);

  // Add a new useEffect to handle viewType changes with scroll position preservation
  useEffect(() => {
    if (data.length > 0) {
      // Save current scroll position before changing the view
      const resultsContainer = document.querySelector('.results-container');
      if (resultsContainer) {
        const currentPosition = resultsContainer.scrollTop;
        console.log(`Saving scroll position: ${currentPosition} for view type: ${viewType}`);
        setScrollPosition(currentPosition);
      }
      
      // Update data when viewType changes
      const newData = getData();
      setData(newData);
      setSummary(calculateSummary(newData));
      
      // Restore scroll position after render
      setTimeout(() => {
        const container = document.querySelector('.results-container');
        if (container) {
          console.log(`Restoring scroll position: ${scrollPosition} for view type: ${viewType}`);
          container.scrollTop = scrollPosition;
        }
      }, 0);
    }
  }, [viewType]);
  
  // Handle export functions
  const handleExportResults = () => {
    console.log('Exporting results...');
    setShowExportOptions(false);
  };
  
  const handleExportGuestList = () => {
    console.log('Exporting guest list...');
    setShowExportOptions(false);
  };
  
  // Update the Run Report button click handler
  const handleRunReport = () => {
    // Validate that dates are entered
    if (!dateFrom || !dateTo) {
      alert("Please enter both 'Date from' and 'Date to' to run the report");
      return;
    }
    
    // Generate data immediately without artificial delay
    const newData = getData();
    setData(newData);
    setSummary(calculateSummary(newData));
    setReportRun(true);
  };
  
  // Add click outside handler for date pickers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFromCalendar || showToCalendar) {
        // Check if the click is outside both calendars
        const isOutsideClick = !event.target.closest('.calendar-container');
        if (isOutsideClick) {
          setShowFromCalendar(false);
          setShowToCalendar(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFromCalendar, showToCalendar]);

  // Add effect to update data when filters change
  useEffect(() => {
    if (data.length > 0 && reportRun) {
      console.log("Filter changed - roomType:", roomType, "includeClosedRooms:", includeClosedRooms, "will update data now");
      const newData = getData();
      console.log(`Generated new data with ${newData.length} rows for roomType: ${roomType}`);
      setData(newData);
      setSummary(calculateSummary(newData));
    }
  }, [roomType, includeClosedRooms, revIncludesTax]);

  // Effect to handle revenue-related columns visibility
  useEffect(() => {
    // If all revenue columns are hidden, uncheck the revenue includes tax checkbox
    if (!visibleColumns.revPAR && !visibleColumns.adr && !visibleColumns.revenue) {
      setRevIncludesTax(false);
    }
  }, [visibleColumns.revPAR, visibleColumns.adr, visibleColumns.revenue]);

  // Update the handler for the includeClosedRooms checkbox
  const handleClosedRoomsChange = () => {
    console.log("Toggling includeClosedRooms from", includeClosedRooms, "to", !includeClosedRooms);
    setIncludeClosedRooms(!includeClosedRooms);
  };

  // Modify the room type change handler to log changes
  const handleRoomTypeChange = (e) => {
    const newRoomType = e.target.value;
    console.log("Room type changing from", roomType, "to", newRoomType);
    setRoomType(newRoomType);
    // Removing the direct data update as it conflicts with the useEffect
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-white rounded-full mr-3"></div>
          <span className="font-bold">Little Hotelier</span>
          <span className="mx-2">|</span>
          <span>Front Desk</span>
        </div>
        <div className="flex items-center">
          <button className="bg-orange-500 text-white px-3 py-1 rounded flex items-center mr-4">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Setup checklist
          </button>
          <span>The Church</span>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="border-b border-gray-300">
        <ul className="flex px-6">
          <li className="py-4 px-3"><a href="#" className="text-gray-600">Calendar</a></li>
          <li className="py-4 px-3"><a href="#" className="text-gray-600">Reservations</a></li>
          <li className="py-4 px-3"><a href="#" className="text-gray-600">Inventory</a></li>
          <li className="py-4 px-3"><a href="#" className="text-gray-600">Guests</a></li>
          <li className="py-4 px-3 border-b-2 border-orange-500"><a href="#" className="text-orange-500">Reports</a></li>
          <li className="py-4 px-3"><a href="#" className="text-gray-600">Setup</a></li>
        </ul>
      </nav>
      
      {/* Sub Navigation */}
      <div className="px-6 py-4 flex space-x-2">
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Revenue</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Check In</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Payments</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Extras</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Housekeeping</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Government</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Statistics</button>
        <button className="py-2 px-4 bg-orange-500 text-white rounded">Occupancy</button>
        <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded">Guests</button>
      </div>
      
      {/* Filters Section - Split into two cards */}
      <div className="px-6 py-4 space-y-4">
        {/* Primary Report Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
              <label className="text-sm mb-1">Date from *</label>
              <div className="relative">
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-44 pr-10"
                  placeholder=""
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onClick={() => setShowFromCalendar(true)}
                />
                <button 
                  className="absolute right-2 top-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFromCalendar(!showFromCalendar);
                    setShowToCalendar(false);
                  }}
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                {showFromCalendar && (
                  <div className="absolute left-0 mt-1 bg-white rounded-md shadow-lg z-20 w-[280px] calendar-container">
                    <div className="bg-gray-700 text-white p-2 rounded-t-md flex justify-between items-center">
                      <button onClick={prevMonth} className="text-white p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div>{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonth]} {calendarYear}</div>
                      <button onClick={nextMonth} className="text-white p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-2">
                      <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                          <div key={`day-header-${index}`} className="text-center font-medium text-sm py-1">{day}</div>
                        ))}
                        {generateCalendarDays().map((day, index) => (
                          <div key={`day-${index}`} className="text-center">
                            {day !== null ? (
                              <button
                                className={`w-8 h-8 rounded-full hover:bg-blue-100 ${day === 1 ? 'bg-orange-500 text-white' : 'text-blue-600'}`}
                                onClick={() => handleDateSelect('from', new Date(calendarYear, calendarMonth, day))}
                              >
                                {day}
                              </button>
                            ) : (
                              <div className="w-8 h-8" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-center">
                        <button
                          className="bg-blue-500 text-white w-full py-2 rounded"
                          onClick={goToToday}
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm mb-1">Date to *</label>
              <div className="relative">
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-44 pr-10"
                  placeholder=""
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onClick={() => setShowToCalendar(true)}
                />
                <button 
                  className="absolute right-2 top-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowToCalendar(!showToCalendar);
                    setShowFromCalendar(false);
                  }}
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                {showToCalendar && (
                  <div className="absolute left-0 mt-1 bg-white rounded-md shadow-lg z-20 w-[280px] calendar-container">
                    <div className="bg-gray-700 text-white p-2 rounded-t-md flex justify-between items-center">
                      <button onClick={prevMonth} className="text-white p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div>{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonth]} {calendarYear}</div>
                      <button onClick={nextMonth} className="text-white p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-2">
                      <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                          <div key={`day-header-${index}`} className="text-center font-medium text-sm py-1">{day}</div>
                        ))}
                        {generateCalendarDays().map((day, index) => (
                          <div key={`day-${index}`} className="text-center">
                            {day !== null ? (
                              <button
                                className={`w-8 h-8 rounded-full hover:bg-blue-100 ${day === 1 ? 'bg-orange-500 text-white' : 'text-blue-600'}`}
                                onClick={() => handleDateSelect('to', new Date(calendarYear, calendarMonth, day))}
                              >
                                {day}
                              </button>
                            ) : (
                              <div className="w-8 h-8" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-center">
                        <button
                          className="bg-blue-500 text-white w-full py-2 rounded"
                          onClick={goToToday}
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-transparent mb-1">_</label>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded flex items-center h-10 transition-colors"
                onClick={handleRunReport}
              >
                Run Report
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">* Required fields</div>
        </div>
        
        {/* View Options - Only shown after report is run */}
        {reportRun && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex flex-wrap gap-6 justify-between">
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <label className="text-sm mb-1">View Type</label>
                  <div className="flex">
                    <button 
                      className={`px-4 py-2 border ${viewType === 'daily' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                      onClick={() => setViewType('daily')}
                    >
                      Daily
                    </button>
                    <button 
                      className={`px-4 py-2 border ${viewType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                      onClick={() => setViewType('weekly')}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`px-4 py-2 border ${viewType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                      onClick={() => setViewType('monthly')}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Room Type</label>
                  <select 
                    className="border rounded px-3 py-2 h-10"
                    value={roomType}
                    onChange={handleRoomTypeChange}
                  >
                    <option value="all">All Rooms (20)</option>
                    <option value="standard">Standard (4)</option>
                    <option value="deluxe">Deluxe (4)</option>
                    <option value="suite">Suite (4)</option>
                    <option value="executive">Executive (4)</option>
                    <option value="family">Family (4)</option>
                  </select>
                </div>
                
                <div className="flex items-center self-center space-x-6 mt-8 -mt-16">
                  <label className="flex items-center justify-center group relative cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeClosedRooms}
                      onChange={handleClosedRoomsChange}
                      className="mr-2"
                    />
                    <span>Include closed rooms</span>
                    <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded w-48 z-10">
                      Closed rooms are temporarily unavailable for booking due to maintenance, renovations, etc.
                    </span>
                  </label>
                  {/* Only show Revenue includes tax when revenue-related columns are visible */}
                  {(visibleColumns.revPAR || visibleColumns.adr || visibleColumns.revenue) && (
                    <label className="flex items-center justify-center group relative cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={revIncludesTax}
                        onChange={() => setRevIncludesTax(!revIncludesTax)}
                        className="mr-2"
                      />
                      <span>Revenue includes tax</span>
                    </label>
                  )}
                </div>
              </div>
              
              <div className="flex items-end gap-2">
                {/* Column Filter Button - Moved here from Results section */}
                <div className="relative">
                  <button 
                    className="border border-blue-600 text-blue-600 px-4 py-2 rounded flex items-center hover:bg-blue-50 h-10"
                    onClick={() => setShowColumnFilter(!showColumnFilter)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"></path>
                    </svg>
                    Columns
                  </button>
                  {showColumnFilter && (
                    <div className="absolute right-0 mt-1 w-60 bg-white rounded-md shadow-lg z-10">
                      <div className="p-2 border-b">
                        <h3 className="font-medium text-gray-700">Show/Hide Columns</h3>
                      </div>
                      <ul className="py-1">
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.date}
                              onChange={() => setVisibleColumns({...visibleColumns, date: !visibleColumns.date})}
                              className="mr-2"
                            />
                            {viewType === 'daily' ? 'Date' : 'Period'}
                          </label>
                        </li>
                        {viewType === 'daily' && (
                          <li className="px-3 py-2 border-b">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={visibleColumns.day}
                                onChange={() => setVisibleColumns({...visibleColumns, day: !visibleColumns.day})}
                                className="mr-2"
                              />
                              Day
                            </label>
                          </li>
                        )}
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.availableRooms}
                              onChange={() => setVisibleColumns({...visibleColumns, availableRooms: !visibleColumns.availableRooms})}
                              className="mr-2"
                            />
                            Available Rooms
                          </label>
                        </li>
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.soldRooms}
                              onChange={() => setVisibleColumns({...visibleColumns, soldRooms: !visibleColumns.soldRooms})}
                              className="mr-2"
                            />
                            Occupied Rooms
                          </label>
                        </li>
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.guests}
                              onChange={() => setVisibleColumns({...visibleColumns, guests: !visibleColumns.guests})}
                              className="mr-2"
                            />
                            Guests
                          </label>
                        </li>
                        {includeClosedRooms && (
                          <li className="px-3 py-2 border-b">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={visibleColumns.unavailableRooms}
                                onChange={() => setVisibleColumns({...visibleColumns, unavailableRooms: !visibleColumns.unavailableRooms})}
                                className="mr-2"
                              />
                              Unavailable Rooms
                            </label>
                          </li>
                        )}
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.occupancyPercentage}
                              onChange={() => setVisibleColumns({...visibleColumns, occupancyPercentage: !visibleColumns.occupancyPercentage})}
                              className="mr-2"
                            />
                            Occupancy %
                          </label>
                        </li>
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.revPAR}
                              onChange={() => setVisibleColumns({...visibleColumns, revPAR: !visibleColumns.revPAR})}
                              className="mr-2"
                            />
                            RevPAR
                          </label>
                        </li>
                        <li className="px-3 py-2 border-b">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.adr}
                              onChange={() => setVisibleColumns({...visibleColumns, adr: !visibleColumns.adr})}
                              className="mr-2"
                            />
                            ADR
                          </label>
                        </li>
                        <li className="px-3 py-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.revenue}
                              onChange={() => setVisibleColumns({...visibleColumns, revenue: !visibleColumns.revenue})}
                              className="mr-2"
                            />
                            Revenue
                          </label>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                {/* Export Button - Changed to orange */}
                <div className="relative">
                  <button 
                    className="border border-orange-500 bg-orange-500 text-white px-4 py-2 rounded flex items-center hover:bg-orange-600 h-10"
                    onClick={() => setShowExportOptions(!showExportOptions)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                    </svg>
                    Export
                  </button>
                  {showExportOptions && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10">
                      <ul className="py-1">
                        <li className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={handleExportResults}>
                          Export Results
                        </li>
                        <li className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={handleExportGuestList}>
                          Export Guest List
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Display results only after report is run */}
      {reportRun && (
        <div className="px-6 py-4">
          <div className="flex justify-between items-center mt-4">
            {/* Removing the "Results" heading as requested */}
          </div>
          {data.length > 0 ? (
            <div className="relative">
              {/* Fixed position first column overlay - FIXING OVERLAY ISSUE */}
              {visibleColumns.date && (
                <div className="absolute top-0 left-0 h-full z-20 pointer-events-none">
                  <table className="w-full border-collapse border-spacing-0 pointer-events-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className={`text-left py-2 px-4 border-b border-gray-300 bg-gray-100 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>
                          {viewType === 'daily' ? 'Date' : 'Period'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={`fixed-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className={`py-2 px-4 border-b border-gray-200 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>
                            <div className={viewType !== 'daily' ? 'whitespace-nowrap' : ''}>
                              {viewType === 'daily' ? item.date : item.period}
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className={`py-2 px-4 border-b border-gray-300 sticky left-0 bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.1)] ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>Summary</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Main scrollable table */}
              <div className="overflow-x-auto results-container border border-gray-200 rounded-lg">
                <table className="w-full border-collapse min-w-full table-fixed">
                  <thead>
                    <tr className="bg-gray-100">
                      {visibleColumns.date && (
                        <th className={`opacity-0 text-left py-2 px-4 border-b border-gray-300 ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>
                          {viewType === 'daily' ? 'Date' : 'Period'}
                        </th>
                      )}
                      {viewType === 'daily' && visibleColumns.day && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Day
                        </th>
                      )}
                      {visibleColumns.availableRooms && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Available Rooms
                        </th>
                      )}
                      {visibleColumns.soldRooms && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Occupied Rooms
                        </th>
                      )}
                      {visibleColumns.guests && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Guests
                        </th>
                      )}
                      {includeClosedRooms && visibleColumns.unavailableRooms && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Unavailable Rooms
                        </th>
                      )}
                      {visibleColumns.occupancyPercentage && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Occupancy %
                        </th>
                      )}
                      {visibleColumns.revPAR && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          RevPAR
                        </th>
                      )}
                      {visibleColumns.adr && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          ADR
                        </th>
                      )}
                      {visibleColumns.revenue && (
                        <th className="text-left py-2 px-4 border-b border-gray-300 w-32">
                          Revenue
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {visibleColumns.date && (
                          <td className={`opacity-0 py-2 px-4 border-b border-gray-200 ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>
                            <div className={viewType !== 'daily' ? 'whitespace-nowrap' : ''}>
                              {viewType === 'daily' ? item.date : item.period}
                            </div>
                          </td>
                        )}
                        {viewType === 'daily' && visibleColumns.day && (
                          <td className="py-2 px-4 border-b border-gray-200">{item.day}</td>
                        )}
                        {visibleColumns.availableRooms && (
                          <td className="py-2 px-4 border-b border-gray-200">
                            {item.availableRooms}
                          </td>
                        )}
                        {visibleColumns.soldRooms && (
                          <td className="py-2 px-4 border-b border-gray-200">
                            {item.soldRooms}
                          </td>
                        )}
                        {visibleColumns.guests && (
                          <td className="py-2 px-4 border-b border-gray-200">
                            {viewType === 'daily' || viewType === 'weekly' || viewType === 'monthly' ? (
                              <button 
                                onClick={() => setSelectedGuestList(viewType === 'daily' ? item.date : item.period)}
                                className="text-blue-600 hover:underline focus:outline-none"
                              >
                                {item.guests}
                              </button>
                            ) : (
                              item.guests
                            )}
                          </td>
                        )}
                        {includeClosedRooms && visibleColumns.unavailableRooms && (
                          <td className="py-2 px-4 border-b border-gray-200">
                            <span className={item.unavailableRooms > 0 ? 'text-red-600 font-medium' : ''}>
                              {item.unavailableRooms || 0}
                            </span>
                          </td>
                        )}
                        {visibleColumns.occupancyPercentage && (
                          <td className="py-2 px-4 border-b border-gray-200">
                            <span className={`px-2 py-1 rounded ${
                              parseFloat(item.occupancyPercentage) <= 25 ? 'bg-red-100 text-red-800' :
                              parseFloat(item.occupancyPercentage) <= 50 ? 'bg-orange-100 text-orange-800' :
                              parseFloat(item.occupancyPercentage) <= 80 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.occupancyPercentage}%
                            </span>
                          </td>
                        )}
                        {visibleColumns.revPAR && (
                          <td className="py-2 px-4 border-b border-gray-200">${item.revPAR}</td>
                        )}
                        {visibleColumns.adr && (
                          <td className="py-2 px-4 border-b border-gray-200">${item.adr}</td>
                        )}
                        {visibleColumns.revenue && (
                          <td className="py-2 px-4 border-b border-gray-200">${item.revenue}</td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      {visibleColumns.date && (
                        <td className={`opacity-0 py-2 px-4 border-b border-gray-300 ${viewType === 'daily' ? 'w-40' : 'w-60'}`}>
                          Summary
                        </td>
                      )}
                      {viewType === 'daily' && visibleColumns.day && (
                        <td className="py-2 px-4 border-b border-gray-300">-</td>
                      )}
                      {visibleColumns.availableRooms && (
                        <td className="py-2 px-4 border-b border-gray-300">{summary.available}</td>
                      )}
                      {visibleColumns.soldRooms && (
                        <td className="py-2 px-4 border-b border-gray-300">{summary.occupied}</td>
                      )}
                      {visibleColumns.guests && (
                        <td className="py-2 px-4 border-b border-gray-300">{summary.guests}</td>
                      )}
                      {includeClosedRooms && visibleColumns.unavailableRooms && (
                        <td className="py-2 px-4 border-b border-gray-300">{summary.unavailableRooms || 0}</td>
                      )}
                      {visibleColumns.occupancyPercentage && (
                        <td className="py-2 px-4 border-b border-gray-300">
                          <span className={`px-2 py-1 rounded ${
                            parseFloat(summary.occupancyPercentage) <= 25 ? 'bg-red-100 text-red-800' :
                            parseFloat(summary.occupancyPercentage) <= 50 ? 'bg-orange-100 text-orange-800' :
                            parseFloat(summary.occupancyPercentage) <= 80 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {summary.occupancyPercentage}%
                          </span>
                        </td>
                      )}
                      {visibleColumns.revPAR && (
                        <td className="py-2 px-4 border-b border-gray-300">${summary.revPAR}</td>
                      )}
                      {visibleColumns.adr && (
                        <td className="py-2 px-4 border-b border-gray-300">${summary.adr}</td>
                      )}
                      {visibleColumns.revenue && (
                        <td className="py-2 px-4 border-b border-gray-300">${summary.revenue}</td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No occupancy data to display</h3>
              <p className="mt-2 text-sm text-gray-500">
                To view occupancy data, please select a date range above and click "Run Report".
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Guest Details Modal */}
      {selectedGuestList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-base font-semibold">Guest List for {selectedGuestList}</h3>
              <button 
                onClick={() => setSelectedGuestList(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="overflow-auto p-6 flex-grow">
              {(() => {
                // Find the correct item based on the view type
                let relevantItem;
                if (viewType === 'daily') {
                  relevantItem = data.find(item => item.date === selectedGuestList);
                } else {
                  relevantItem = data.find(item => 
                    (viewType === 'weekly' || viewType === 'monthly') && 
                    item.period === selectedGuestList
                  );
                }
                
                if (relevantItem?.guestDetails?.length > 0) {
                  return (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-16">Room</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-24">Type</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-40">Primary Guest</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300">All Guests</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-24">Check In</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-24">Check Out</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300 w-36">Phone</th>
                          <th className="text-left py-2 px-3 border-b border-gray-300">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relevantItem.guestDetails.map(guest => (
                          <tr key={guest.id} className="hover:bg-gray-50 align-top">
                            <td className="py-2 px-3 border-b border-gray-200">{guest.room}</td>
                            <td className="py-2 px-3 border-b border-gray-200">{guest.roomType}</td>
                            <td className="py-2 px-3 border-b border-gray-200 font-medium">{guest.primaryGuest}</td>
                            <td className="py-2 px-3 border-b border-gray-200">
                              <ul className="list-disc pl-5 space-y-1">
                                {guest.allGuests.map((person, idx) => (
                                  <li key={idx} className="text-sm">
                                    <span className="font-medium">{person.name}</span> 
                                    <span className="text-gray-500 text-xs ml-1">({person.age}, {person.type})</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="py-2 px-3 border-b border-gray-200">{guest.checkIn}</td>
                            <td className="py-2 px-3 border-b border-gray-200">{guest.checkOut}</td>
                            <td className="py-2 px-3 border-b border-gray-200">{guest.phone}</td>
                            <td className="py-2 px-3 border-b border-gray-200">
                              {guest.notes ? (
                                <span className={guest.notes.toLowerCase().includes('allerg') ? 'text-red-600 font-medium' : ''}>
                                  {guest.notes}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                } else {
                  return (
                    <div className="text-center py-8 text-gray-500">No guest details available for this period.</div>
                  );
                }
              })()}
            </div>
            <div className="border-t px-6 py-4 flex justify-between items-center text-sm">
              <div>
                Total Guests: {(() => {
                  // Find the correct count based on the view type
                  if (viewType === 'daily') {
                    return data.find(item => item.date === selectedGuestList)?.guests || 0;
                  } else {
                    return data.find(item => item.period === selectedGuestList)?.guests || 0;
                  }
                })()}
              </div>
              <button 
                className="bg-orange-500 text-white px-4 py-2 rounded flex items-center text-sm"
                onClick={() => console.log('Exporting guest list for', selectedGuestList)}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
                Export Guest List
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Occupancy Thresholds - Only shown after report is run */}
      {reportRun && (
        <div className="mt-4 px-4 py-3">
          <div className="flex flex-wrap">
            <div className="flex items-center mr-8 mb-2">
              <div className="w-5 h-5 bg-red-100 border border-red-200 rounded mr-2"></div>
              <span className="text-sm text-red-800">Low Occupancy: 0-25%</span>
            </div>
            <div className="flex items-center mr-8 mb-2">
              <div className="w-5 h-5 bg-orange-100 border border-orange-200 rounded mr-2"></div>
              <span className="text-sm text-orange-800">Medium Occupancy: 26-50%</span>
            </div>
            <div className="flex items-center mr-8 mb-2">
              <div className="w-5 h-5 bg-yellow-100 border border-yellow-200 rounded mr-2"></div>
              <span className="text-sm text-yellow-800">High Occupancy: 51-80%</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 bg-green-100 border border-green-200 rounded mr-2"></div>
              <span className="text-sm text-green-800">Full Occupancy: 81-100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDashboard; 