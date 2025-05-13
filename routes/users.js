import { Router } from "express";
import { register, logIn, getProfilePicture, setProfilePicture, getUserProfileById, toggleUserPrivacyById, addSchedule, removeSchedule } from "../data/users.js";
import { getCourseById, unpackSchedules, getSectionTimes, searchByClass, searchByProfessor, scheduleToCSV, calendarExport, conflicts, addToSchedule, removeFromSchedule } from "../data/courses.js";
import multer from 'multer';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { type } from "os";

const storage = multer.memoryStorage()
const upload = multer({ storage })
const router = Router()

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
    const {username, firstName, lastName, email, password} = req.body;
    

    try {
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
    const {email, password} = req.body
    //ill just do error checks in the form validation

    try {
        const user = await logIn(email, password)
        req.session.user = {
            firstName: user.firstName,
            lastName: user.lastName,
            userId: user.userId,
            createdAt: user.createdAt,
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
    const targetUserId = req.params.userId

    try {
        const user = await getUserProfileById(targetUserId)
        const viewerId = req.session.user?.userId
        const isOwner = viewerId === user.userId        
        if (!user.public && !isOwner) {
          const referer = req.get("Referer") || "/"
          return res.redirect(referer)
        }       
        res.render("profile", {
          session: req.session,
          firstName: user.firstName,
          lastName: user.lastName,
          userId: user.userId,
          createdAt: user.createdAt,
          schedules: user.schedules,
          comments: user.comments,
          isOwner: viewerId === user.userId,
          public: user.public
        })
    } catch (e) {
        return res.status(404).render("error", { message: e.message })
    }
})

router.route("/profile/toggle-privacy").post(async (req, res) => {
    try {
      const user = req.session.user
      if (!user) {
        return res.status(401).render("error", { message: "Not logged in" })
      }
  
      const newSetting = req.body.public === "on"
  
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
        const image = await getProfilePicture(req.params.userId)
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
        const file = req.file

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
    const { query, year, semester, level, format, professor } = req.query;
  
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

    const schedule = req.session.user.schedules.find(x => x.name === req.params.name);
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
        const file = req.file
        let schedule;

        if (!file) {
            return res.status(400).send("no file")
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

    const schedule = req.session.user.schedules.find(x => x.name === req.params.name);
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

router.route("/course/view/:courseId").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    try {
        const course = await getCourseById(req.params.courseId);
        if (!course) throw 'Course not found';
        
        let schedules = await unpackSchedules(req.session.user.schedules);
        const selectedSchedule = req.query.schedule;

        schedules = schedules.map(schedule => {
            const alreadyContains = (schedule.courses.find(x => x._id.toString() == course._id.toString()) != undefined)
            if (!alreadyContains) schedule.courses.push(course);
            const sections = getSectionTimes(schedule)
            return { name: schedule.name, sections: sections, conflicting: conflicts(sections), alreadyContains: alreadyContains, selected: (schedule.name == selectedSchedule)};
        });

        res.render('course', {session: req.session, ...course, schedules: schedules});
    }
    catch (e){
        res.status(400).render('error', {message: e, session: req.session});
    }
})
router.route("/course/add/:courseId").post(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    try {
        if (!req.body.scheduleSelect) throw 'No schedule selected';
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