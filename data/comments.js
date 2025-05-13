import { faculty, courses, comments, users } from "../config/mongoCollections.js";
import * as faculty_data from "../data/faculty.js";
import * as course_data from "../data/courses.js";
import { ObjectId } from "mongodb";

const str_checker = (str, str_name, func_sig) => {
    if (!str) throw `${func_sig}: No value for ${str_name}`;
    if (typeof str !== 'string') throw  `${func_sig}: ${str_name} is not of type \'string\'`;
    str = str.trim();
    if (str.length === 0) throw `${func_sig}: ${str_name} cannot consist of just spaces`;
    return str;
}

const id_checker = (id, id_name, func_sig) => {
    id = str_checker(id, id_name, func_sig);
    if (!ObjectId.isValid(id)) throw `${func_sig}: ${id_name} is an invalid ObjectId`;
    return id;
}

const title_checker = (title, title_name, func_sig) => {
    title = str_checker(title, title_name, func_sig);
    if (title.length < 3) throw `${func_sig}: ${title_name} must be at least 3 characters` // for things like 'wow' or 'WOW' no character restriction for things like 'Wow!' or whatever
    return title;
}
const num_checker = (num, num_name, func_sig) => {
    if (typeof num !== 'number') throw `${func_sig}: ${num_name} is not of type \'number\'`;
    if (isNaN(num)) throw `${func_sig}: ${num_name} is of type \'NaN\'`;
}

const new_date = (time) => {
    let date = new Date();
    let h = date.getHours();
    let min = date.getMinutes();
    let mo = date.getMonth() + 1;
    let d = date.getDate();
    let year = date.getFullYear().toString();

    mo = (mo.toString().length === 1) ? `0${mo}` : mo.toString();
    d = (d.toString().length === 1) ? `0${d}` : d.toString();

    let meridiem;
    if (h === 0) { // 00:00
        h = 12;
        meridiem = "AM";
    } else if (h < 12) {    // 01:00 AM - 11:59 AM
        meridiem = "AM";
    } else if (h > 12) {    // 01:00 PM - 11:59 PM
        h -= 12;
        meridiem = "PM";
    } else {                // 12 noon
        meridiem = "PM";
    }

    h = (h.toString().length === 1) ? `0${h}` : h.toString();
    min = (min.toString().length === 1) ? `0${min}` : min.toString();

    if (time) {
        return `${mo}/${d}/${year} ${h}:${min}${meridiem}`;
    } else {
        return `${mo}/${d}/${year}`;
    }
}

export const getCommentById = async (commentId) => {
    //commentId = id_checker(commentId, 'commentId', 'getCommentById()');

    const commentCollection = await comments();
    let comment = commentCollection.findOne({_id: new ObjectId(commentId.toString())});

    if (!comment) throw new Error(`getCommentById(): Comment not found`);
    return comment;
}

export const getAllComments = async () => {
    const commentCollection = await comments();
    let all_comments = await commentCollection.find({}).toArray();
    return all_comments;
}
 
export const createComment = async (userId, title, content, rating, ref_id) => {
    userId = str_checker(userId, 'userId', 'createComment()');
    title = title_checker(title, 'title', 'createComment()');
    content = str_checker(content, 'content', 'createComment()');
    num_checker(rating, 'rating', 'createComment()');
    if (rating < 1 || rating > 5) throw `createComment(): rating cannot be less than 1 or greater than 5`;

    let new_comment = {
        userId: userId,
        title: title,
        content: content,
        rating: rating,
        date: new_date(true),
        for: ""
    };
    const commentCollection = await comments();
    const insert_info = await commentCollection.insertOne(new_comment);
    if (!insert_info.acknowledged || !insert_info.insertedId) throw `createComment(): Could not add comment`;
    
    const inserted_comment = await getCommentById(insert_info.insertedId.toString());
    return inserted_comment;
}

export const deleteComment = async (commentId) => {
    commentId = id_checker(commentId, 'commentId', 'deleteComment()');

    const commentCollection = await comments();
    const delete_info = await commentCollection.findOneAndDelete({
        _id: new ObjectId(id)
    });
    if (!delete_info) throw `deleteComment(): Could not delete comment with id ${commentId}`;
    return delete_info;
}


// Faculty Comments
export const addFacultyComment = async (f_id, userId, title, content, rating) => {
    f_id = id_checker(f_id, 'f_id', 'addFacultyComment()');
    // commentId = id_checker(commentId, 'commentId', 'addFacultyComment()');
    // user_id = id_checker(user_id, 'user_id', 'addFacultyComment()')
    userId = str_checker(userId, 'userId', 'addFacultyComment()');
    title = title_checker(title, 'title', 'addFacultyComment()');
    content = str_checker(content, 'content', 'addFacultyComment()');
    num_checker(rating, 'rating', 'addFacultyComment()');
    if (rating < 0 || rating > 5) throw `addFacultyComment(): rating cannot be less than 0 or greater than 5`;

    let new_comment = {
        // user_id: new Object(user_id),
        userId: userId,
        title: title,
        content: content,
        rating: rating,
        date: new_date(true),
        for_id: new ObjectId(f_id),
        for: "faculty"
    };

    const commentCollection = await comments();
    const insert_info = await commentCollection.insertOne(new_comment);
    if (!insert_info.acknowledged || !insert_info.insertedId) throw `addFacultyComment(): Could not add comment`;
    const inserted_comment = await getCommentById(insert_info.insertedId.toString())

    let commentId = inserted_comment._id;
    const facultyCollection = await faculty();
    let faculty_member = await faculty_data.getFacultyById(f_id);
    if (faculty_member.comments.includes(commentId)) throw `addFacultyComment(): commentId already exists in faculty member's comments`;
    let new_fm_comments_len = faculty_member.comments.length + 1;
    let new_rating = 0;
    faculty_member.comments.push(commentId.toString())
    for (let i = 0; i < new_fm_comments_len; i++) {
        let c_id = faculty_member.comments[i];
        let comment = await getCommentById(c_id);
        new_rating += comment.rating
    }
    new_rating /= new_fm_comments_len;
    const upd_faculty_member = await facultyCollection.findOneAndUpdate(
        {_id: new ObjectId(f_id)}, 
        {$push: {"comments": commentId}, $set: {"rating": new_rating}}, 
        {returnDocument: 'after'}
    );  
    if (!upd_faculty_member) throw `addFacultyComment(): Could not add comment to faculty member`;
    
    const userCollection = await users();
    let user = await userCollection.findOneAndUpdate(
        {userId: userId},
        {$push: {"comments": commentId}},
        {returnDocument: 'after'}
    );
    if (!user) throw `addFacultyComment(): Could not add comment to user`;


    return upd_faculty_member;
}

export const deleteFacultyComment = async (f_id, commentId, userId) => {
    f_id = id_checker(f_id, 'f_id', 'deleteFacultyComment()');
    commentId = id_checker(commentId, 'commentId', 'deleteFacultyComment()');

    const commentCollection = await comments();
    const facultyCollection = await faculty();
    const usersCollection =  await users()

    const validation = await getCommentById(commentId) //have to make sure the person deleting is the user of the comment...
    if (validation.userId !== userId) {
        return 
    }

    let faculty_member = await faculty_data.getFacultyById(f_id);

    let new_fm_comments_len = faculty_member.comments.length - 1 === 0 ? 1 : faculty_member.comments.length - 1;
    let new_rating = 0;
    let new_comments = [];


    for (const comment of faculty_member.comments) {
         if (comment._id !== commentId && comment._id) {            
            let com = await getCommentById(comment._id);
            if (com) {
                console.log(com)
                new_rating += com.rating;
                new_comments.push(com._id);
            }

        }
    }
    
    new_rating /= new_fm_comments_len;

    const upd_faculty_member = await facultyCollection.findOneAndUpdate(
        {_id: new ObjectId(f_id)},
        {$set: {comments: new_comments, rating: new_rating}},
        {returnDocument: 'after'}
    );

    if (!upd_faculty_member) throw new Error(`deleteFacultyComment(): Could not delete comment from faculty member`);

    const deleted_comment_info = await commentCollection.findOneAndDelete(
        {_id: new ObjectId(commentId)}
    );
    if (!deleted_comment_info) throw new Error(`deleteFacultyComment(): Could not delete comment with id ${commentId}`);

    const user_delete_comment_info = await await usersCollection.updateOne(
        { userId: userId },
        {
            $pull: {
                comments: new ObjectId(commentId)
            }
        }
    );

    if (!user_delete_comment_info) throw new Error(`deleteFacultyComment(): Could not delete comment with id ${commentId}`);

    return deleted_comment_info;

}

// Course Comments
// Please note: This is to act as a starting point please update according to how u wish it set
export const addCourseSectionComment = async (course_id, commentId) => {
    let func_sig = 'addCourseSectionComment()';
    course_id = id_checker(course_id, 'course_id', func_sig);
    commentId = id_checker(commentId, 'commentId', func_sig);

    const coursesCollection = await courses();

    let course = await course_data.getCourseById(course_id);
    if (course.comments.includes(commentId)) throw `${func_sig}: commentId already exists in course's comments`;
    let new_c_comments_len = course.comments.length + 1;
    let new_rating = 0;
    course.comments.push(commentId)
    for (let i = 0; i < new_c_comments_len; i++) {
        let c_id = course.comments[i];
        let comment = await getCommentById(c_id);
        new_rating += comment.rating
    }
    new_rating /= new_c_comments_len;
    const upd_course = await coursesCollection.findOneAndUpdate(
        {_id: new ObjectId(course_id)}, 
        {$push: {"comments": commentId}, $set: {"rating": new_rating}}, 
        {returnDocument: 'after'}
    );

    if (!upd_course) throw `${func_sig}: Could not add comment to course`;

    return upd_course;

}

export const deleteCourseComment = async (course_id, commentId) => {
    let func_sig = 'deleteCourseComment()';
    course_id = id_checker(course_id, 'course_id', func_sig);
    commentId = id_checker(commentId, 'commentId', func_sig);

    const commentCollection = await comments();
    const coursesCollection = await courses();
    let course = await course_data.getCourseById(course_id);

    let new_c_comments_len = course.comments.length - 1 === 0 ? 1 : course.comments.length - 1;
    let new_rating = 0;
    let new_comments = [];
    course.comments.map((c_id) => {
        if (c_id !== commentId) {
            let comment = getCommentById(c_id);
            new_rating += comment.rating;
            new_comments.push(c_id);
        }
    })
    new_rating /= new_c_comments_len;

    const upd_course = await coursesCollection.findOneAndUpdate(
        {_id: new ObjectId(f_id)},
        {$set: {comments: new_comments, rating: new_rating}},
        {returnDocument: 'after'}
    );

    if (!upd_course) throw `${func_sig}: Could not delete comment from faculty member`;

    const deleted_comment_info = await commentCollection.findOneAndDelete(
        {_id: new ObjectId(commentId)}
    );
    if (!deleted_comment_info) throw `${func_sig}: Could not delete comment with id ${commentId}`;

    return deleted_comment_info;

}

export const getAllCommentsByCourseName = async (course_name) => {
    let func_sig = 'getAllCommentsByCourseName()';
    course_name = str_checker(course_name, 'course_name', func_sig);

    const coursesCollection = await courses();
    let name_to_search = course_name.replace(/[\[\]\-\\\/^$\*\+\?\.\(\)\|\{\}]/g, '\\$&')
    let course_sections = await coursesCollection.find(
        {"name": {$regex: `^${name_to_search}$`, $options: 'i'}}
    ).toArray();

    if (course_sections.length === 0) throw `${func_sig}: ${course_name} does not exist`;

    let course_comments = [];
    for (let i = 0; i < course_sections.length; i++) {
        for (let j = 0; j < course_sections[i].comments.length; j++) {
            let comment = await getCommentById(course_sections[i].comments[j]);
            course_comments.push(comment);
        }
    }

    return course_comments;
}

export const getOverallCourseRating = async (course_name) => {
    let func_sig = 'getOverallCourseRating()';
    course_name = str_checker(course_name, 'course_name', func_sig);

    const coursesCollection = await courses();
    let name_to_search = course_name.replace(/[\[\]\-\\\/^$\*\+\?\.\(\)\|\{\}]/g, '\\$&')
    let course_sections = await coursesCollection.find(
        {"name": {$regex: `^${name_to_search}$`, $options: 'i'}}
    ).toArray();

    if (course_sections.length === 0) throw `${func_sig}: ${course_name} does not exist`;

    let rating = 0;
    let all_comments_len = 0;
    for (let i = 0; i < course_sections.length; i++) {
        for (let j = 0; j < course_sections[i].comments.length; j++) {
            let comment = await getCommentById(course_sections[i].comments[j]);
            rating += comment.rating;
            all_comments_len++;
        }
    }

    rating /= all_comments_len;

    return rating;
}

// User Comments
// Please note: This is to act as a starting point please update according to how u wish it set
export const getCommentByUserId = async (userId) => {
    userId = str_checker(userId, 'userId', 'getCommentByUserId()');

    const commentCollection = await comments();
    let comment = commentCollection.findOne({"userId": userId});

    if (!comment) throw `getCommentByUserId(): Comment not found`;
    return comment;
}

export const getAllCommentsByUserId = async (userId) => {
    userId = str_checker(userId, 'userId', 'getCommentByUserId()');

    const commentCollection = await comments();
    let comments = commentCollection.find(
        {"userId": userId}
    ).toArray();

    if (comments.length === 0) throw `${func_sig}: User has no comments`;
    return comments;
}

export const userAddComment = async (userId, title, content, rating) => {
    userId = str_checker(userId, 'userId', 'createComment()');
    title = title_checker(title, 'title', 'createComment()');
    content = str_checker(content, 'content', 'createComment()');
    num_checker(rating, 'rating', 'createComment()');
    if (rating < 1 || rating > 5) throw `createComment(): rating cannot be less than 1 or greater than 5`;

    // also i dont see a comments field for users so change accordingly?
    // maybe have addFacultyComment() and addCourseSectionComment() here and just have a field indicating which and call the function accordingly?
    let comment = await createComment(userId, title, content, rating);
    const userCollection = await users();
    let user = await userCollection.findOneAndUpdate(
        {"userId": userId},
        {$push: {"comments": comment._id}},
        {returnDocument: 'after'}
    );

    return comment._id; // as of now, to be used to be passed into addFacultyComment() and addCourseSectionComment() right after this is called
}

export const userDeleteComment = async (userId, commentId) => {
    userId = str_checker(userId, 'userId', 'userDeleteComment()');
    commentId = id_checker(commentId, 'commentId', 'userDeleteComment()');

    // also i dont see a comments field for users so change accordingly?
    // maybe have addFacultyComment() and addCourseSectionComment() here and just have a field indicating which and call the function accordingly?
    let comment = await createComment(userId, title, content, rating);
    const userCollection = await users();
    let user = await userCollection.findOne({"userId": userId});
    if (!user) throw `userDeleteComment(): Cannot find user with id of ${userId}`;
    let new_comments = [];
    user.comments.map((c_id) => {
        if (commentId !== c_id) {
            new_comments.append(c_id);
        }
    })
    let upd_user = await userCollection.findOneAndUpdate(
        {"userId": userId},
        {$set: {"comments": comment._id}},
        {returnDocument: 'after'}
    );

    const commentCollection = await comments();
    const deleted_comment_info = await commentCollection.findOneAndDelete(
        {_id: new ObjectId(commentId)}
    );
    if (!deleted_comment_info) throw `${func_sig}: Could not delete comment with id ${commentId}`;

    return deleted_comment_info;
}



