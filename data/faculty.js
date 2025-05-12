import { faculty } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

const str_checker = (str, str_name, func_sig) => {
    if (!str) throw `${func_sig}: No value for ${str_name}`;
    if (typeof str !== 'string') throw  `${func_sig}: ${str_name} is not of type \'string\'`;
    str = str.trim();
    if (str.length === 0) throw `${func_sig}: ${str_name} cannot consist of just spaces`;
    return str;
}

const id_checker = (id, id_name, func_sig) => {
    if (!id) throw `${func_sig}: No value for ${id_name}`;
    if (typeof id !== 'string') throw  `${func_sig}: ${id_name} is not of type \'string\'`;
    id = id.trim();
    if (id.length === 0) throw `${func_sig}: ${id_name} cannot consist of just spaces`;
    if (!ObjectId.isValid(id)) throw `${func_sig}: ${id_name} is an invalid ObjectId`;
    return id;
}

export const getFacultyById = async (id) => {
    id = id_checker(id, 'id', 'getFacultyById()');
    
    const facultyCollection = await faculty();
    const faculty_member = await facultyCollection.findOne({_id: new ObjectId(id)});
    if (!faculty_member) throw `getFacultyById(): Faculty member not found`;

    return faculty_member;
}

export const getAllFaculty = async () => {
    const facultyCollection = await faculty();
    const all_faculty = await facultyCollection.find({}).toArray();
    return all_faculty;
}

export const getAllFacultyByName = async (name) => {
    let func_sig = 'getFacultyByName'
    name = str_checker(name, 'name', func_sig);

    const facultyCollection = await faculty();
    let name_to_search = name.replace(/[\[\]\-\\\/^$\*\+\?\.\(\)\|\{\}]/g, '\\$&'); // so they dont mess up the regex
    const faculty_members = await facultyCollection.find(
        {"name": {$regex: `${name_to_search}`, $options: `i`}}
    ).toArray();

    if (faculty_members.length === 0) throw `${func_sig}: No faculty members exist with a name that includes \'${name}\'`;
    return faculty_members;
}