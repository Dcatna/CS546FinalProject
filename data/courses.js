import { courses } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

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

export const searchByClass = async (name) => {
    if(!name || typeof name !== 'string') throw "Invalid name";
    const classColl = await courses();
    try {
        const courses = await classColl.find({
          $or: [
            {"Course Section": { $regex: name, $options: 'i'}},
            {"Course": { $regex: name, $options: 'i'}}
          ]
        }).limit(20);
        return courses;
      } catch (err) {
        console.error('Error during search:', err);
      }
}

export const searchByProfessor = async (name) => {
    if(!name || typeof name !== 'string') throw "Invalid name";
    const classColl = await courses();
    try {
        const courses = await classColl.find({"Instructor": { $regex: name, $options: 'i' }}).limit(20);
        return courses;
      } catch (err) {
        console.error('Error during search:', err);
      }
}
