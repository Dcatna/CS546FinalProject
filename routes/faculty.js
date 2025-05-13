import { Router } from "express";
import { ObjectId } from "mongodb";
import * as faculty from "../data/faculty.js";
import * as comments from "../data/comments.js";
import * as courses from "../data/courses.js";

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
    if (isNaN(parseFloat(num))) throw `${func_sig}: ${num_name} is not of type \'number\'`;
    if (isNaN(num)) throw `${func_sig}: ${num_name} is of type \'NaN\'`;
    return parseFloat(num);
}

const router = Router();
router.route("/").get(async (req, res) => {
    let faculty_members;
    try {
        faculty_members = await faculty.getAllFaculty();
    } catch (e) {
        return res.status(500).json({error: e});
    }
    try {
        return res.json({faculty_members});
    } catch (e) {
        return res.status(500).json({error: e});
    }
});

router.route("/name/:name").get(async (req, res) => {
    let func_sig = `GET /name/${req.params.name}`;
    let name, faculty_members;
    try {
        name = str_checker(req.params.name, 'name', func_sig);
    } catch (e) {
        return res.status(404).json({error: e});
    }

    try {
        faculty_members = await faculty.getAllFacultyByName(name);
        return res.json(faculty_members);
    } catch (e) {
        return res.status(404).json({error: e});
    }

})

router.route("/member/:facultyId").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    let faculty_member, id;
    try {
        id = id_checker(req.params.facultyId, 'id', `GET /faculty/member/${req.params.facultyId}`);
        console.log("ID", id)
    } catch (e) {
        return res.status(404).json({error: e});
    }
    try {
        faculty_member = await faculty.getFacultyById(id);
        let faculty_courses = [];
        let faculty_comments = [];
        for (let i = 0; i < faculty_member.courses.length; i++) {
            let course = await courses.getCourseById(faculty_member.courses[i].toString());
            faculty_courses.push(course);
        }
        for (let i = 0; i < faculty_member.comments.length; i++) {
            let Comment = await comments.getCommentById(faculty_member.comments[i].toString());
            Comment._id =  Comment._id.toString()
            faculty_comments.push(Comment);
        }
        
        res.render('faculty', {
            session: req.session,
            title: faculty_member.name, 
            id: faculty_member._id.toString(),
            name: faculty_member.name, 
            faculty_title: faculty_member.title,
            office: faculty_member.office,
            rating: faculty_member.rating,
            courses: faculty_courses,
            comments: faculty_comments,
            curr_user: req.session.user.userId
        })
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
})

router.route("/member/:facultyId/comment").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    let faculty_member, id;
    try {
        id = id_checker(req.params.facultyId, 'id', `GET /faculty/member/${req.params.facultyId}`);
    } catch (e) {
        res.status(404).render('error', {message: e, session: req.session});
    }
    try {
        faculty_member = await faculty.getFacultyById(id);
        res.render('comment', {session: req.session, title: `Comment: ${faculty_member.name}`, faculty_id: id.toString()});
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
}).post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    let userId, title, content, rating, f_id, faculty_member, upd_faculty_member;
    let func_sig = `POST /faculty/member/${req.params.facultyId}/comment`;
    try {
        if (!req.body || Object.keys(req.body).length === 0) throw `${func_sig}: request body cannot be empty`;
        const keys = Object.keys(req.body);
        if (keys.length > 3) throw `${func_sig}: request body cannot have more than 4 fields`;
        keys.map((key) => {if ((key !== `title`) && (key !== `content`) && (key !== `rating`)) throw `${func_sig}: \'${key}\' is an invalid key`});
        
        // id = id_checker(req.session.id, '_id', func_sig);
        userId = str_checker(req.session.user.userId, 'userId', func_sig);
        title = title_checker(req.body.title, 'title', func_sig);
        content = str_checker(req.body.content, 'content', func_sig);

        rating = num_checker(req.body.rating, 'rating', func_sig);
        if (rating < 0 || rating > 5) throw `${func_sig}: rating cannot be less than 0 or greater than 5`;

        f_id = id_checker(req.params.facultyId, 'f_id', func_sig);
        try {
            faculty_member = await faculty.getFacultyById(f_id);
        } catch (e) {
            throw `${func_sig}: faculty with the id of ${req.params.facultyId} does not exist`;
        }
    } catch (e) {
        res.status(404).render('error', {message: e, session: req.session});
    }

    try {
        upd_faculty_member = await comments.addFacultyComment(f_id, userId, title, content, rating);
        res.redirect(`/faculty/member/${f_id}`);
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
    
});

router.route("/member/:facultyId/:commentId").get(async (req, res) => {
    let f_id, c_id, comment;
    let func_sig = `GET /faculty/member/${req.params.facultyId}/${req.params.commentId}`
    try {
        f_id = id_checker(req.params.facultyId, 'facultyId', func_sig);
        c_id = id_checker(req.params.commentId, 'commentId', func_sig);
    } catch (e) {
        return res.status(404).json({error: e});
    }
    try {
        comment = await comments.getCommentById(c_id);
        return res.json(comment);
    } catch (e) {
        return res.status(500).json({error: e});
    }
}).delete(async (req, res) => {
    let f_id, c_id;
    let func_sig = `DELETE /faculty/member/${req.params.facultyId}/${req.params.commentId}`
    try {
        f_id = id_checker(req.params.facultyId, 'facultyId', func_sig);
        c_id = id_checker(req.params.commentId, 'commentId', func_sig);
    } catch (e) {
        return res.status(404).json({error: e});
    }

    try {
        let deletedComment = await comments.deleteFacultyComment(f_id, c_id);
        return res.json(deletedComment);
    } catch (e) {
        return res.status(500).json({error: e});
    }
})



export default router;