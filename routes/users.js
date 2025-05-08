import { Router } from "express";
import { register, logIn, getProfilePicture, setProfilePicture } from "../data/users.js";
import { getCourseById } from "../data/courses.js";
import multer from 'multer';

const storage = multer.memoryStorage()
const upload = multer({ storage })
const router = Router()

router.route("/").get(async (req, res) => {
    // const user = req.session.user

    res.render("signup") //idk
})

router.route("/register").get(async (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/profile")
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
        return res.redirect("/profile")
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
        return res.redirect("/profile")
    } catch (e) {
        console.log(e);
        return res.status(400).render("signin", {
            error: e.message,
            session: req.session
        })
    }

})

router.route("/profile").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("login")
    }
    const user = req.session.user
    res.render("profile", {
        firstName: user.firstName,
        lastName: user.lastName,
        userId: user.userId,
        createdAt: user.createdAt,
        schedules: user.schedules,
        session: req.session
    })
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
        res.redirect("/profile") //trigger refresh
    } catch (e) {
        res.status(500).send("upload failed: " + e)
    }
})

router.route("/schedules").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("login")
    }
    const schedules = await Promise.all(req.session.user.schedules.map(async schedule => ({
        name: schedule.name,
        courses: await Promise.all(schedule.courses.map(async courseId => await getCourseById(courseId)))
    })));
    console.log(schedules);
    res.render("schedules", {
        session: req.session,
        schedules: schedules
    });
})
export default router