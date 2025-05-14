import { faculty, courses, users } from "../config/mongoCollections.js";
import { closeConnection } from "../config/mongoConnection.js";
import facultyData from "./new_faculty.json" with {type: 'json'};   // with {type: 'json'} bc of error "'file/.../faculty.json' needs an import attribute of 'type: json'" and assert wont work either
import coursesData from "./courses.json" with {type: 'json'};   // with {type: 'json'} bc of error "'file/.../faculty.json' needs an import attribute of 'type: json'" and assert wont work either
import {register, setProfilePicture } from "../data/users.js";
import {createComment, addFacultyComment, addCourseSectionComment, getCommentById} from "../data/comments.js";
import { getAllFaculty } from "../data/faculty.js";
import { getAllCourses, getCourseById } from "../data/courses.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const facultyCollection = await faculty();
const coursesCollection = await courses();
const usersCollection = await users();
await facultyCollection.drop(); // reset
await coursesCollection.drop(); // reset
await usersCollection.drop(); // reset


const faculty_seed = async (f_data) => {
    for (let i = 0; i < f_data.length; i++) {
        let member = f_data[i];
        let intermediate_member = {
            name: member["Name"],   // the objects in the json file have like capital letters in the names of the fields
            title: member["Title"],
            office: member["Office"],
            email: member["Email"],
            rating: 0,
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
        let updated_faculty;
        let course = c_data[i];
        let insert_info;
        let intermediate_course = {
            course_section: course["Course Section"],
            course: course["Course"],
            status: course["Open"],
            instructor: course["Instructor"],
            instructor_id: "",
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
            updated_faculty = await facultyCollection.findOneAndUpdate(
                {"name": intermediate_course.instructor}, 
                {$push: {"courses": insert_info.insertedId}},
                {returnDocument: 'after'}
            );
        } catch (e) {
            console.log(e);
        }

        try {
            let inserted_course = await getCourseById(insert_info.insertedId.toString());
            if (updated_faculty && updated_faculty.name === inserted_course.instructor) {
                let f_id = updated_faculty._id.toString();
                let upd_course= await coursesCollection.findOneAndUpdate({_id: insert_info.insertedId}, {$set: {"instructor_id": f_id}});
            }
        } catch (e) {
            console.log(e);
        }
    }
}

const user_seed = async () => {
    const user1 = await register("JohnB", "John", "Bern", "johnbern@gmail.com", "testerPass12!") //add some basic users
    const user2 = await register("CharlieH", "Charlie", "Harper", "charlieharper@gmail.com", "SuperSecretPass12!")
    const user3 = await register("OliviaJ", "Olivia", "Jaffe", "oliviajaffe@gmail.com", "Noclue42!!")
    const user4 = await register("JakeF", "Jake", "Fullerton", "jakefullerton@gmail.com", "ILikeFarming32!")

    //set some pfps ! only gonna do 2 of 4
    const oliviaPfp = fs.readFileSync(path.join(__dirname, "seed_pfps/oliviapfp.jpg"))
    const jakePfp = fs.readFileSync(path.join(__dirname, "seed_pfps/jakef.jpg"))

    await setProfilePicture("OliviaJ", oliviaPfp, "image/jpeg")
    await setProfilePicture("JakeF", jakePfp, "image/jpeg")

    //add sum comments
    const faculty = await getAllFaculty()
    const courses = await getAllCourses()
    const profId = faculty[0]._id.toString()
    const courseId = courses[0]._id.toString()

    // Perhaps change register to return the user object? Or smth like {registrationCompleted: true, user: user} or whatever
    // I changed addFacultyComment() to do the creation and addition in the same function as opposed to separately
    const comment1 = await addFacultyComment(profId, "OliviaJ", "BEST PROF!!", "made concepts easy to understand and is always available!", 5)
    // const comment1 = await createComment("OliviaJ", "BEST PROF!!", "made concepts easy to understand and is always available!", 5)
    // await addFacultyComment(profId, comment1._id.toString())

    // will change addCourseSectionComment() similarly
    const comment2 = await addCourseSectionComment(courseId, "JakeF", "Solid Course FR", "Doesnt move too fast and assignments are interesting", 4)

}

await faculty_seed(facultyData);
await courses_seed(coursesData);
await user_seed()




await closeConnection();
