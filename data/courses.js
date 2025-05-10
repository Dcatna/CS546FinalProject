import { courses, users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { Parser } from '@json2csv/plainjs';

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
    if(!name || typeof name !== 'string') throw "Invalid name";
    const classColl = await courses();
    const query = {
        $and: [
          {
            $or: [
              {"Course Section": { $regex: name, $options: 'i'}},
              {"Course": { $regex: name, $options: 'i'}}
            ]
          }
        ]
    };
    if(filters.year){
      query.$and.push({"Year": filters.year});
    }
    if(filters.semester){
      query.$and.push({"Semester": filters.semester});
    }
    try {
      const courses = await classColl.find(query).toArray();
      let filteredCourses = courses;
      if(filters.level){
        filteredCourses = courses.filter(course => filters.level.includes(getLevel(course)));
      }
      return filteredCourses;
    } catch (err) {
        console.error('Error during search:', err);
    }
}

export const searchByProfessor = async (name) => {
  if(!name || typeof name !== 'string') throw "Invalid name";
    const classColl = await courses();
    const query = {
        $and: [
          {
            "Instructor": {$regex: name, $options: 'i'}
          }
        ]
    };
  if(filters.year){
    query.$and.push({"Year": filters.year});
  }
  if(filters.semester){
    query.$and.push({"Semester": filters.semester});
  }
  try {
    const courses = await classColl.find(query).toArray();
    let filteredCourses = courses;
    if(filters.level){
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
  for (const course of schedule.courses){
    try {
      const { startTime, duration } = parseTimeRange(course.time);
    for (const day of course.days.split("/")){
      sections.push({
        name: course.course,
        startTime: startTime,
        duration: duration,
        day: daysOfWeek.indexOf(day)
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
  const section = course["Course Section"];
  const match = section.match(/\b(\d{3})\b/);
  if (!match) return null;
  
  const num = parseInt(match[1], 10);
  return num >= 500 ? "Graduate" : "Undergraduate";
}

export const scheduleToCSV = (schedule) => {
  const opts = {};
  const parser = new Parser(opts);
  const csv = parser.parse(schedule);
  return csv;
}

export const addSchedule = async (schedule, session) => {
  const coursesCollection = await courses();
  const usersCollection = await users();

  if (!schedule) throw 'No schedule object';
  if (!session || !session.user) throw 'Invalid session';
  if (!schedule.name || !schedule.courses) throw 'Invalid schedule properties';
  if (typeof(schedule.name) != 'string') throw 'Invalid schedule name';
  if (!Array.isArray(schedule.courses)) throw 'Invalid courses property';
  
  //check if all the courses in the new schedule exist. In theory this should happen in parallel, but idk async stuff is weird
  await Promise.all(schedule.courses.map(async (courseId) => {
    if (!await coursesCollection.findOne({_id: new ObjectId(courseId)})) throw 'Course does not exist';
  }))
  //check if the user already has a schedule with this name
  for (const userSchedule of session.user.schedules){
    if (userSchedule.name == schedule.name) throw 'Schedule with that name already exists';
  }

  const res = await usersCollection.findOneAndUpdate({userId: session.user.userId}, {$push: {schedules: {name: schedule.name, courses: schedule.courses}}});
  if (!res) throw 'Error updating database';
  session.user.schedules.push({name: schedule.name, courses: schedule.courses});
}