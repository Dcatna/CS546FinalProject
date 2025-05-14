import { courses, users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { Parser } from '@json2csv/plainjs';


export const getAllCourses = async () => {
  const coursesCollection = await courses()
  const allCourses = await coursesCollection.find({}).toArray()
  return allCourses
}

export const getCourseById = async (id) => {
    if (!id) throw `getCourseById(): No value for id`;
    if (typeof id !== 'string') throw  `getCourseById(): id is not of type \'string\'`;
    id = id.trim();
    if (id.length === 0) throw `getCourseById(): id cannot consist of just spaces`;
    if (!ObjectId.isValid(id)) throw `getCourseById(): id is an invalid objectID`;
    
    const coursesCollection = await courses();
    const course = await coursesCollection.findOne({_id: new ObjectId(id)});
    if (!course) throw `lookupCourse: Course not found`;
    return course;
}

export const searchByClass = async (name, filters = {}) => {
    const classColl = await courses();
    const query = { $and: [] };

    // Only add name-based search if name is a non-empty string
    if (typeof name === 'string' && name.trim().length > 0) {
        query.$and.push({
            $or: [
                { course_section: { $regex: name.trim(), $options: 'i' } },
                { course: { $regex: name.trim(), $options: 'i' } }
            ]
        });
    }
    const finalQuery = query.$and.length > 0 ? query : {};

    try {
      const courses = await classColl.find(finalQuery).toArray();
      let filteredCourses = courses;
      if(Array.isArray(filters.level) && filters.level.length > 0){
        filteredCourses = courses.filter(course => filters.level.includes(getLevel(course)));
      }
      return filteredCourses;
    } catch (err) {
        console.error('Error during search:', err);
    }
}

export const searchByProfessor = async (name, filters = {}) => {
  const classColl = await courses();
  const query = { $and: [] };

  if (typeof name === 'string' && name.trim().length > 0) {
    query.$and.push({
      instructor: { $regex: name.trim(), $options: 'i' }
    });
  }

  const finalQuery = query.$and.length > 0 ? query : {};

  try {
    const courses = await classColl.find(finalQuery).toArray();
    let filteredCourses = courses;
    if(Array.isArray(filters.level) && filters.level.length > 0){
      filteredCourses = courses.filter(course => filters.level.includes(getLevel(course)));
      }
    return filteredCourses;
  } catch (err) {
    console.error('Error during search:', err);
  }
}

const parseTimeRange = (rangeStr) => {
  const [startStr, endStr] = rangeStr.split(" - ").map(s => s.trim());

  const toDecimal = (timeStr) => {
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  const startTime = toDecimal(startStr);
  const endTime = toDecimal(endStr);
  const duration = endTime - startTime;

  return { startTime, duration };
}

//schedules are stored in DB as arrays of course ObjectIds, so here we load all of the courses from the database for each of the user's schedules
export const unpackSchedules = async (schedules) => {
  const out = []
  for (const schedule of schedules){
    out.push({
      name: schedule.name,
      courses: await Promise.all(schedule.courses.map(async courseId => await getCourseById(courseId)))
    })
    
  }
  return out;
}

//given a schedule, return an array of 'sections'; i.e. a class that meets 3 times a week has 3 sections, which each need to be rendered on the schedule.
//each section has the course name, a start time (1:30pm = 13.5 e.g), and a duration in hours.
export const getSectionTimes = (schedule) => {
  const sections = [];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const colors = [
    "#f0c674", "#b5bd68", "#81a2be", "#de935f", "#cc6666",
    "#8abeb7", "#c5b87d", "#b294bb", "#a3685a", "#c0c0c0"
  ];

  function hashStringToColorIndex(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colors.length;
  }

  for (const course of schedule.courses){
    try {
      const { startTime, duration } = parseTimeRange(course.time);
      const color = colors[hashStringToColorIndex(course.course)];
    for (const day of course.days.split("/")){
      sections.push({
        name: course.course_section,
        time: course.time,
        startTime: startTime,
        duration: duration,
        day: daysOfWeek.indexOf(day),
        color: color
      })
    }
    }
    catch(e){
      continue;
    }
  }
  return sections;
}

export const getLevel = (course) => {
  const section = course.course_section;
  const match = section.match(/(\d{3})/);
  if (!match) return null;
  
  const num = parseInt(match[1], 10);
  return num >= 500 ? "grad" : "undergrad";
}

export const scheduleToCSV = (schedule) => {
  const opts = {};
  const parser = new Parser(opts);
  const csv = parser.parse(schedule);
  return csv;
}

export const calendarExport = async (schedule) => {
  
  [schedule] = await unpackSchedules([schedule]);
  
  let courses = schedule.courses.filter(course => course.time)
  courses = courses.map(course => ({
    "Subject": course.course,
    "Start Time": course.time.split(" - ")[0].trim(),
    "End Time": course.time.split(" - ")[1].trim(),
    "Description": course.instructor,
    "Location": course.location,
    daysOfWeek: course.days.split('/').map(day => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(day))
  }));
  function pad(n){
    return String(n).padStart(2, '0')
  }
  let data = [];
  
  const year = 2025;
  const isLeapYear = year % 400 == 0 ? true : (year % 100 == 0 ? false : (year % 4 == 0));
  const startMonth = 9; //1 indexed, september
  const startDay = 2;
  const startDoW = 1; //0 indexed, tuesday

  const endMonth = 12;
  const endDay = 22;

  let month = startMonth, day = startDay, dow = startDoW;
  while (month < endMonth || day <= endDay){

    const date = `${pad(month)}/${pad(day)}/${year}`

    const events = courses.filter(course => course.daysOfWeek.includes(dow)).map(event => ({
      "Subject": event["Subject"],
      "Start Time": event["Start Time"],
      "End Time": event["End Time"],
      "Description": event["Description"],
      "Location": event["Location"],
      "Start Date": date
    }));

    data = data.concat(events);

    day += 1;

    if (day > [-1, 31, (isLeapYear ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]){
      month += 1;
      day = 1;
    }
    dow = (dow + 1) % 7;
  }

  const opts = {};
  const parser = new Parser(opts);
  const csv = parser.parse(data);
  return csv;
}

//expects an array of sections, as returned by getSectionTimes above
export const conflicts = (sections) => {
  for (let i = 1; i < sections.length; i++){
    for (let j = 0; j < i; j++){
    
      const sect1 = sections[i];
      const sect2 = sections[j];

      if (sect1.day != sect2.day) continue;

      const end1 = sect1.startTime + sect1.duration;
      const end2 = sect2.startTime + sect2.duration;

      // Check if sect1 and sect2 overlap
      if (sect1.startTime < end2 && sect2.startTime < end1) return true;
    }
  }
}

export const addToSchedule = async (scheduleName, courseId, session) => {
  
  if (!session || !session.user) throw 'Invalid session';
  if (typeof(scheduleName) != 'string') throw 'Invalid schedule name';

  const coursesCollection = await courses();
  const usersCollection = await users();

  if (!await coursesCollection.findOne({_id: new ObjectId(courseId)})) throw 'No course with that id exists';
  const scheduleIdx = session.user.schedules.findIndex(schedule => schedule.name === scheduleName);
  if (scheduleIdx == -1) throw 'No schedule with that name exists';
  if (session.user.schedules[scheduleIdx].courses.indexOf(courseId) != -1) throw 'Schedule already contains section'

  const res = await usersCollection.findOneAndUpdate({userId: session.user.userId}, {
    $push: {
      "schedules.$[schedule].courses": new ObjectId(courseId)
    }
  },
  {
    arrayFilters: [
      { "schedule.name": scheduleName }
    ]
  })
  if (!res) throw "Unable to update schedule";

  session.user.schedules[scheduleIdx].courses.push(new ObjectId(courseId));
}

export const removeFromSchedule = async (scheduleName, courseId, session) => {
  if (!session || !session.user) throw 'Invalid session';
  if (typeof(scheduleName) != 'string') throw 'Invalid schedule name';

  const usersCollection = await users();
  const scheduleIdx = session.user.schedules.findIndex(schedule => schedule.name === scheduleName);
  if (scheduleIdx == -1) throw 'No schedule with that name exists';
  if (session.user.schedules[scheduleIdx].courses.indexOf(courseId) == -1) throw 'Schedule does not contain that course';

  const res = await usersCollection.findOneAndUpdate({userId: session.user.userId}, {
    $pull: {
      "schedules.$[schedule].courses": new ObjectId(courseId)
    }
  }, {
    arrayFilters: [{ "schedule.name": scheduleName }]
  })
  if (res.modifiedCount == 0) {
    throw 'Unable to remove schedule with that name';
  }
  session.user.schedules[scheduleIdx].courses = session.user.schedules[scheduleIdx].courses.filter(cid => cid != courseId);
}