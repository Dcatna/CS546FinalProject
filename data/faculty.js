import { faculty } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

export const getFacultyById = async (id) => {
    if (!id) throw `getFacultyById(): No value for id`;
    if (typeof id !== 'string') throw  `getFacultyById(): id is not of type \'string\'`;
    id = id.trim();
    if (id.length === 0) throw `getFacultyById(): id cannot consist of just spaces`;
    if (!ObjectId.isValid(id)) throw `getFacultyById(): id is an invalid objectID`;
    
    const facultyCollection = await faculty();
    const faculty_member = await facultyCollection.findOne({_id: new ObjectId(id)});
    if (!faculty_member) throw `getFacultyById(): Faculty member not found`;

    return faculty_member;
}