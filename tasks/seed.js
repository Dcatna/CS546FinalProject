import { faculty, courses } from "../config/mongoCollections.js";
import { closeConnection } from "../config/mongoConnection.js";
import facultyData from "./faculty.json" with {type: 'json'};   // with {type: 'json'} bc of error "'file/.../faculty.json' needs an import attribute of 'type: json'" and assert wont work either
import coursesData from "./courses.json" with {type: 'json'};   // with {type: 'json'} bc of error "'file/.../faculty.json' needs an import attribute of 'type: json'" and assert wont work either


const facultyCollection = await faculty();
const coursesCollection = await courses();
await facultyCollection.drop();
await coursesCollection.drop();

const faculty_seed = async (f_data) => {
    for (let i = 0; i < f_data.length; i++) {
        let member = f_data[i];
        let intermediate_member = {
            name: member["Name"],   // the objects in the json file have like capital letters in the names of the fields
            title: member["Title"],
            office: member["Office"],
            email: member["Email"],
            courses: [],
            comments: []
        }

        try {
            const insert_info = await facultyCollection.insertOne(intermediate_member);
            if (!insert_info.acknowledged || !insert_info.insertedId) throw `Could not add faculty member`;  
        } catch (e) {
            console.log(e);
        }
    }
}

const courses_seed = async (c_data) => {
    for (let i = 0; i < c_data.length; i++) {
        let course = c_data[i];
        let insert_info;
        let intermediate_course = {
            course_section: course["Course Section"],
            course: course["Course"],
            status: course["Open"],
            instructor: course["Instructor"],
            location: course["Location"],
            days: course["Days"],
            time: course["Time"],
            rating: 0,
            comments: []
        }
    
        try {
            insert_info = await coursesCollection.insertOne(intermediate_course);
            if (!insert_info.acknowledged || !insert_info.insertedId) throw `Could not add course`;
        } catch (e) {
            console.log(e);
        }
    
        try {
            const updated_faculty = await facultyCollection.findOneAndUpdate({"name": intermediate_course.instructor}, {$push: {"courses": insert_info.insertedId}});
        } catch (e) {
            console.log(e);
        }
    }
}

await faculty_seed(facultyData);
await courses_seed(coursesData);

await closeConnection();
