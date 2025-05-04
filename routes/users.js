import { Router } from "express";
import { register, logIn } from "../data/users.js";

const router = Router()

router.route("/").get(async (req, res) => {
    // const user = req.session.user

    res.render("signin") //idk
})

router.route("/register").get(async (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/profile")
    }
    res.render("signup")
}).post(async (req, res) => {
    const {username, firstName, lastName, email, password} = req.body;
    

    try {
        const result = await register(username, firstName, lastName, email, password)
        if (result.registrationCompleted) {
            return res.redirect("/login")
        } else {
            return res.status(500).render("signup", {
                errors: "internal server error"
            })
        }
    } catch (e) {
        return res.status(400).render("signup", {
            errors: e.message
        })
    }
})

router.route("/login").get(async (req, res) => {
    if(req.session && req.session.user) {
        return res.redirect("/profile")
    }
    res.render("signin")
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
            error: e.message
        })
    }

})

router.route("/profile").get(async (req, res) => {
    if(!req.session || !req.session.user) {
        return res.redirect("signin")
    }
    const user = req.session.user
    res.render("profile", {
        firstName: user.firstName,
        lastName: user.lastName,
        userId: user.userId,
        createdAt: user.createdAt,
        schedules: user.schedules
    })
})

export default router