import { Router } from "express";
import { ObjectId } from "mongodb";
import { register, logIn, getProfilePicture, setProfilePicture, getUserProfileById, toggleUserPrivacyById, addSchedule, removeSchedule, getAllUsers } from "../data/users.js";
import { getCourseById, unpackSchedules, getSectionTimes, searchByClass, searchByProfessor, scheduleToCSV, calendarExport, conflicts, addToSchedule, removeFromSchedule } from "../data/courses.js";
import {createComment, addCourseSectionComment, getAllCommentsByCourseId, getAllCommentsByCourseName, getOverallCourseRating, deleteCourseComment} from "../data/comments.js"
import { getAllComments } from "../data/comments.js";
import { getFacultyById } from "../data/faculty.js";
import { new_date } from "../data/comments.js";
import multer from 'multer';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { users, courses, comments } from "../config/mongoCollections.js";
import xss from 'xss';


const storage = multer.memoryStorage()
const upload = multer({ storage })
const router = Router()

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

router.route("/").get(async (req, res) => {
    // const user = req.session.user

    res.redirect("/register") //idk
})

router.route("/register").get(async (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(`/profile/${req.session.user.userId}`)
    }
    res.render("signup", {session: req.session})
}).post(async (req, res) => {
    let {username, firstName, lastName, email, password} = req.body;
    username = xss(username)
    firstName = xss(firstName)
    lastName = xss(lastName)
    email = xss(email)
    password = xss(password)
    

    try {
        if(!username || typeof username !== "string" || !/^[A-Za-z0-9]{5,20}$/.test(username.trim())) { //prolly jsut gonna check objectid too 
            throw new Error("invalid userId")
        }
        if(!firstName || typeof firstName !== "string" || !lastName || typeof lastName !== "string") {
            throw new Error("invalid first or last name")
        }
        if(!email || typeof email !== "string" || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new Error("invalid email address")
        }
        if(!password || typeof password !== "string" || !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            throw new Error("invalid password")
        }
        const result = await register(username, firstName, lastName, email, password)
        if (result.registrationCompleted) {
            return res.redirect("/login")
        } else {
            return res.status(500).render("signup", {
                errors: "internal server error",
                session: req.session
            })
        }
    } catch (e) {
        return res.status(400).render("signup", {
            errors: e.message,
            session: req.session
        })
    }
})

router.route("/login").get(async (req, res) => {
    if(req.session && req.session.user) {
        return res.redirect(`/profile/${req.session.user.userId}`)
    }
    res.render("signin", {session: req.session})
}).post(async (req, res) => {
    let {email, password} = req.body
    email = xss(email)
    password = xss(password)
    //ill just do error checks in the form validation

    try {
        if(!email || typeof email !== "string") {
            throw new Error("invalid email address")
        }
        if (!password || typeof password !== "string") {
            throw new Error("invalid password")
        }
        const user = await logIn(email, password)
        req.session.user = {
            firstName: xss(user.firstName),
            lastName: xss(user.lastName),
            userId: xss(user.userId),
            createdAt: xss(user.createdAt),
            schedules: user.schedules
        }
        return res.redirect(`/profile/${user.userId}`)
    } catch (e) {
        console.log(e);
        return res.status(400).render("signin", {
            errors: e.message,
            session: req.session
        })
    }

})

router.route("/profile/:userId").get(async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect("/login");
        }
        
        const targetUserId = xss(req.params.userId)
        const user = await getUserProfileById(targetUserId);
        
        if (!user) {
            throw new Error("User not found");
        }
        
        const viewerId = req.session.user?.userId;
        const isOwner = viewerId === user.userId;
        
        if (!user.public && !isOwner) {
            const referer = req.get("Referer") || "/";
            return res.redirect(referer);
        }
        
        let allComments = await getAllComments();
        let comments = allComments.filter(comment => comment.userId === user.userId);

        const courseComments = [];
        const facultyComments = [];

        for (let comment of comments) {
            if (comment.for === "courses") {
                const course = await getCourseById((comment.for_id).toString());
                if (course) {
                    courseComments.push({ comment, course });
                }
            } else if (comment.for === "faculty") {
                const faculty = await getFacultyById((comment.for_id).toString());
                if (faculty) {
                    facultyComments.push({ comment, faculty });
                }
            }
        }
        res.render("profile", {
            session: req.session,
            firstName: user.firstName,
            lastName: user.lastName,
            userId: user.userId,
            createdAt: user.createdAt,
            schedules: user.schedules,
            courseComments: courseComments,
            facultyComments: facultyComments,
            isOwner: viewerId === user.userId,
            public: user.public
        });

    } catch (e) {
        console.error(e); 
        return res.status(404).render("error", { message: e.message });
    }
});


router.route("/profile/toggle-privacy").post(async (req, res) => {
    try {
      const user = req.session.user
      if (!user) {
        return res.status(401).render("error", { message: "Not logged in" })
      }
  
      const newSetting = xss(req.body.public) === "on"
  
      const result = await  toggleUserPrivacyById(user.userId, newSetting)
      if (!result) {
        return res.status(500).render("error", { message: "Failed to update profile privacy" })
      }
  
      return res.redirect(`/profile/${user.userId}`)
    } catch (e) {
      return res.status(500).render("error", { message: e.message })
    }
})
  

router.route("/profile/image/:userId").get(async (req, res) => {
    try {
        const image = await getProfilePicture(xss(req.params.userId))
        if (image === null) {
            return res.send(null) //send null so it knows to use the default
        }
        res.set("Content-Type", image.contentType)
        res.send(image.data)

    } catch (e) {
        res.status(404).send("image not found")
    }
})

router.post("/profile/upload", upload.single("profileImage"), async (req, res) => {
    try {
        const userId = req.session.user.userId
        const file = xss(req.file)

        if (!file) {
            return res.status(400).send("no files")
        }

        await setProfilePicture(userId, file.buffer, file.mimetype)
        res.redirect(`/profile/${userId}`) //trigger refresh
    } catch (e) {
        res.status(500).send("upload failed: " + e)
    }
})

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login")
  })
})

router.route("/schedules").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    let schedules = await unpackSchedules(req.session.user.schedules);
    schedules = schedules.map(schedule => ({
        ...schedule,
        sections: getSectionTimes(schedule),
        hasAsyncClass: schedule.courses.some(course => !course.time)
    }));
    res.render("schedules", {
        session: req.session,
        schedules: schedules
    });
})

router.route("/view/:scheduleId").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    let scheduleId;
    try {
        scheduleId = new ObjectId(req.params.scheduleId);
    } catch (e) {
        return res.status(400).send("Invalid schedule ID");
    }

    const allUsers = await getAllUsers();

    let found = null;

    for(const user of allUsers){
        const match = user.schedules.find(x => x._id && x._id.equals(scheduleId));
        if(match){
            found = match;
            break;
        }
    }

    if(!found){
        return res.status(404).send("Schedule not found");
    }
    try {
        const [schedule] = await unpackSchedules([found]);
        const fullSchedule = {
            ...schedule,
            sections: getSectionTimes(schedule),
            hasAsyncClass: schedule.courses.some(course => !course.time)
        };

        res.render("schedule", {
            session: req.session,
            schedules: [fullSchedule]
        });
    } catch (e) {
        console.log(e.message)
        res.status(500).redirect(req.get("Referer") || "/")
    }

});

router.get('/search', (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login")
    }
    res.render('search', {session: req.session}); 
  });
  
router.get('/search/results', async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login")
    }
    let { query, year, semester, level, format, professor } = req.query;
    query = xss(query);
    year = xss(year);
    semester = xss(semester);
    level = xss(level);
    format = xss(format);
    professor = xss(professor);
  
    const filters = {
      year,
      semester,
      level: Array.isArray(level) ? level : level ? [level] : [],
      format: Array.isArray(format) ? format : format ? [format] : []
    };
  
    try {
      let results;
  
      if (professor) {
        results = await searchByProfessor(professor, filters);
      } else {
        results = await searchByClass(query, filters);
      }
  
      res.render('results', { courses: results, query, filters, session: req.session });
    } catch (e) {
      console.error(e);
      res.status(500).send("Search failed");
    }
});

router.route("/schedules/csv/:name").get((req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    const schedule = req.session.user.schedules.find(x => x.name === xss(req.params.name));
    try {
        if (!schedule) throw 'Schedule not found';
        res.header('Content-Type', 'text/csv');
        res.attachment('schedule.csv'); // prompts file download
        res.send(scheduleToCSV(schedule));
    }
    catch (e){
        res.status(404).render('error', {
            session: req.session,
            message: e
        });
    }
})

router.post("/schedules/upload", upload.single("scheduleCSV"), async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        const userId = req.session.user.userId
        const file = xss(req.file)
        let schedule;

        if (!file) {
            return res.status(400).render('error', {message: 'No file recieved', session: req.session})
        }

        // Parse the CSV file
        Readable.from(file.buffer)
        .pipe(csv())
        .on('data', (row) => {
            schedule = row;
            schedule.courses = JSON.parse(schedule.courses);
        })
        .on('end', async () => {
            try {
                await addSchedule(schedule, req.session);
                res.redirect('/schedules')
            }
            catch (e) {res.status(500).render('error', {message: `Error parsing csv: ${e}`});}
        })
        .on('error', (err) => {
            res.status(500).render('error', {message: `Error parsing csv: ${e}`});
        });
        
    } catch (e) {
        res.status(500).send("Upload failed: " + e)
    }
})

router.route("/schedules/calendar/:name").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    const schedule = req.session.user.schedules.find(x => x.name === xss(req.params.name));
    try {
        if (!schedule) throw 'Schedule not found';
        res.header('Content-Type', 'text/csv');
        res.attachment('calendar.csv'); // prompts file download
        res.send(await calendarExport(schedule));
    }
    catch (e){
        res.status(404).render('error', {
            session: req.session,
            message: e
        });
    }
})

router.route("/course/:courseId/comment").get( async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        const courseId = xss(req.params.courseId)
        res.render("courseComment", {
            courseId: courseId,
            session: req.session
        })

    } catch (e) {
        res.status(400).render('error', {message: e.message});
    }
})

router.route("/course/:courseId/comment/create").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        const userId = req.session.user.userId
        const userCollection = await users()
        const commentsCollection = await comments()
        const courseCollection = await courses()

        if (!ObjectId.isValid(req.params.courseId) || !courseCollection.findOne({_id: new ObjectId(req.params.courseId)})) throw new Error('That course does not exist')
        const comment = {
            userId: userId,
            title: xss(req.body.title),
            content: xss(req.body.content),
            rating: Number(xss(req.body.rating)),
            for_id: new ObjectId(xss(req.params.courseId)),
            date: new_date(true),
            for: "courses"
        }
        
        Object.values(comment).forEach((com) => {
            if(!com) {
                return res.status(400).redirect(req.get("Referer") || "/")
            }
        })

        const inserted = await commentsCollection.insertOne(comment)
        if (!inserted.acknowledged) {
            return res.status(500).redirect(req.get("Referer") || "/")
        }

        await userCollection.findOneAndUpdate(
            {userId: userId},
            {$push: {"comments": inserted.insertedId}}
        )

        const courseComments = await courseCollection.findOneAndUpdate(
            {_id: new ObjectId(xss(req.params.courseId))},
            {$push: {"comments": inserted.insertedId}}
        )
        let newRating = 0
        if (courseComments.comments.length === 0) {
            newRating = Number(xss(req.body.rating))
            
        } else {
            newRating = Math.floor( (courseComments.rating + Number(xss(req.body.rating)) ) / 2)
        }

        await courseCollection.updateOne(
                {_id: new ObjectId(xss(req.params.courseId))},
                {$set: {rating: newRating}}
            )


        res.status(200).redirect(`/course/view/${xss(req.params.courseId)}`)

    } catch (e) {
        res.status(400).render('error', {message: e.message});
    }
}) 

router.route("/course/:courseId/:commentId/comment/delete").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        if (!ObjectId.isValid(req.params.courseId)) throw new Error("Invalid course id");
        if (!ObjectId.isValid(req.params.commentId)) throw new Error("Invalid comment id");
        const userId = req.session.user.userId
        const userCollection = await users()
        const commentsCollection = await comments()
        const courseCollection = await courses()

        await userCollection.findOneAndUpdate(
            {userId: userId},
            {
                $pull: {
                    comments: new ObjectId(xss(req.params.commentId))
                }
            }
        )

        const courseComments = await courseCollection.findOneAndUpdate(
            {_id: new ObjectId(xss(req.params.courseId))},
            {
                $pull: {
                    comments: new ObjectId(xss(req.params.commentId))
                }
            }
        )

        const comment = await commentsCollection.findOne(
            {_id: new ObjectId(xss(req.params.commentId))}
        )

        /*
            n = og num ratings
            avg = og average
            r = rating to be removed
            new_avg = ((n * avg) - r) / n -1
        */

       const n = courseComments.comments.length
       let newRating = 0
       if (n <= 1) {
            newRating = 0
       } else {
            newRating = Math.floor( ((n * courseComments.rating) - comment.rating) / (n - 1) )
       }
        await courseCollection.updateOne(
            {_id: new ObjectId(xss(req.params.courseId))},
            {$set: {rating: newRating}}
        )

        await commentsCollection.deleteOne(
            {_id: new ObjectId(xss(req.params.commentId))}
        )

        res.status(200).redirect(`/course/view/${xss(req.params.courseId)}`)


    } catch (e) {
        res.status(400).render('error', {message: e.message});
    }

})

router.route("/course/view/:courseId").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        req.params.courseId = xss(req.params.courseId)
        if (!req.params.courseId) throw `getCourseById(): No value for id`;
        if (typeof req.params.courseId !== 'string') throw  `Course id is not of type \'string\'`;
        if (!ObjectId.isValid(req.params.courseId)) throw `Course id is an invalid objectID`;

        const course = await getCourseById(req.params.courseId);
        const userId = req.session.user.userId
        const courseComment = await getAllCommentsByCourseId(xss(req.params.courseId))

        if (!course) throw 'Course not found';
        
        let schedules = await unpackSchedules(req.session.user.schedules);
        const selectedSchedule = xss(req.query.schedule);

        schedules = schedules.map(schedule => {
            const alreadyContains = (schedule.courses.find(x => x._id.toString() == course._id.toString()) != undefined)
            if (!alreadyContains) schedule.courses.push(course);
            const sections = getSectionTimes(schedule)
            return { name: schedule.name, sections: sections, conflicting: conflicts(sections), alreadyContains: alreadyContains, selected: (schedule.name == selectedSchedule)};
        });

        res.render('course', {...course, schedules: schedules, comments: courseComment, userId: userId, session: req.session});
        // res.render('course', {...course, schedules: schedules, comments: courseComment, userId: userId});
    }
    catch (e){
        res.status(400).render('error', {message: e, session: req.session});
    }
})
router.route("/course/view/:courseId/comment").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    let course, id;
    try {
        id = id_checker(xss(req.params.courseId), 'id', `GET /faculty/member/${xss(req.params.courseId)}/comment`);
    } catch (e) {
        res.status(404).render('error', {message: e, session: req.session});
    }
    try {
        course = await getCourseById(id);
        res.render('comment', {session: req.session, title: `Comment: ${course.course_section}`, course_id: id.toString(), faculty: false});
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
}).post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    let userId, title, content, rating, courseId, course, upd_course_member;
    let func_sig = `POST /course/view/${xss(req.params.courseId)}/comment`;
    try {
        if (!req.body || Object.keys(req.body).length === 0) throw `${func_sig}: request body cannot be empty`;
        const keys = Object.keys(req.body);
        if (keys.length > 3) throw `${func_sig}: request body cannot have more than 3 fields`;
        keys.map((key) => {if ((key !== `title`) && (key !== `content`) && (key !== `rating`)) throw `${func_sig}: \'${key}\' is an invalid key`});
        
        // id = id_checker(req.session.id, '_id', func_sig);
        userId = str_checker(req.session.user.userId, 'userId', func_sig);
        title = title_checker(xss(req.body.title), 'title', func_sig);
        content = str_checker(xss(req.body.content), 'content', func_sig);

        rating = num_checker(xss(req.body.rating), 'rating', func_sig);
        if (rating < 0 || rating > 5) throw `${func_sig}: rating cannot be less than 0 or greater than 5`;

        courseId = id_checker(xss(req.params.courseId), 'courseId', func_sig);
        try {
            course = await getCourseById(courseId);
        } catch (e) {
            throw `${func_sig}: course with the id of ${xss(req.params.courseId)} does not exist`;
        }
    } catch (e) {
        res.status(404).render('error', {message: e, session: req.session});
    }

    try {
        upd_course_member = await addCourseSectionComment(courseId, userId, title, content, rating);
        res.redirect(`/course/view/${courseId}`);
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
    
});

router.route("/course/view/:courseId/comment/:commentId/delete").post(async (req, res) => {
    let courseId, commentId;
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    const userId = req.session.user.userId

    let func_sig = `POST /faculty/member/${xss(req.params.courseId)}/comment/${xss(req.params.commentId)}/delete`
    try {
        courseId = id_checker(xss(req.params.courseId), 'courseId', func_sig);
        commentId = id_checker(xss(req.params.commentId), 'commentId', func_sig);
    } catch (e) {
        res.status(404).render('error', {message: e, session: req.session});
    }

    try {
        let deletedComment = await deleteCourseComment(courseId, userId, commentId);
        return res.redirect(req.get("Referrer") || "/")
    } catch (e) {
        res.status(500).render('error', {message: e, session: req.session});
    }
})

router.route("/course/add/:courseId").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    try {
        req.body.scheduleSelect = xss(req.body.scheduleSelect)
        req.params.courseId = xss(req.params.courseId)
        if (!req.body.scheduleSelect) throw 'No schedule selected';
        if (typeof(req.body.scheduleSelect) != 'string') throw 'Invalid schedule name';

        await addToSchedule(req.body.scheduleSelect, req.params.courseId, req.session);
        return res.redirect(`/course/view/${req.params.courseId}?schedule=${encodeURIComponent(req.body.scheduleSelect)}`)
    }
    catch (e){
        res.status(400).render('error', {message: e, session: req.session});
    }
})

router.route("/course/remove/:courseId").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    try {
        req.body.scheduleSelect = xss(req.body.scheduleSelect)
        req.params.courseId = xss(req.params.courseId)
        if (!req.body.scheduleSelect) throw 'No schedule selected';
        if (typeof(req.body.scheduleSelect) != 'string') throw 'Invalid schedule name';
        await removeFromSchedule(req.body.scheduleSelect, req.params.courseId, req.session);
        return res.redirect(`/course/view/${req.params.courseId}?schedule=${encodeURIComponent(req.body.scheduleSelect)}`);
    }   
    catch (e) {
        res.status(400).render('error', {message: e, session: req.session});
    } 
})

router.route("/schedules/delete/:name").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    try {
        if (!req.params.name) throw 'No name provided';
        if (typeof(req.params.name) != 'string') throw 'Name not a string';
        await removeSchedule(req.params.name, req.session);
        return res.redirect('/schedules')
    }
    catch (e){
        res.status(400).render('error', {message: e, session: req.session});
    }
})

router.route("/schedules/new").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    try {
        if (!req.body.scheduleName || typeof(req.body.scheduleName) != 'string') throw 'Invalid schedule name';
        await addSchedule({
            name: req.body.scheduleName,
            courses: []
        }, req.session);
        res.redirect('/schedules');
    }
    catch (e){
        res.status(400).render('error', {message: e, session: req.session});
    }
})
  
export default router