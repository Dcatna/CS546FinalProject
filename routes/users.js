import { Router } from "express";
import { register, logIn } from "../data/users";
const router = Router()

router.route("/").get(async (req, res) => {
    // const user = req.session.user

    res.render("register.html") //idk
})

router.route("/register").get(async (req, res) => {
    if (req.session.user) {
        return res.redirect("/profile")
    }
    res.render("signup.html")
}).post(async (req, res) => {
    const {userId, firstName, lastName, emailAddr, password} = req.body

    try {
        const result = await register(userId, firstName, lastName, emailAddr, password)
        if (result.registrationCompleted) {
            return res.redirect("/signin")
        } else {
            return res.status(500).render("signup.html", {
                errors: "internal server error"
            })
        }
    } catch (e) {
        return res.status(400).render("signup.html", {
            errors: e.message
        })
    }
})

router.route("/login").get(async (req, res) => {
    if(req.session.user) {
        return res.redirect("/profile")
    }
    res.render("signin.html")
}).post(async (req, res) => {
    const {email, password} = req.body
    //ill just do error checks in the form validation

    try {
        const user = await logIn(email, password)
        req.sesion.user = {
            firstName: user.firstName,
            lastName: user.lastName,
            userId: user.userId,
            createdAt: user.createdAt,
            schedules: user.schedules
        }
        return res.redirect("/profile")
    } catch (e) {
        return res.status(400).render("login.html", {
            error: e.message
        })
    }

})

router.route("/profile").get(async (req, res) => {
    if(!req.session.user) {
        return res.redirect("signin.html")
    }
    const user = req.session.user
    res.render("profile.html", {
        firstName: user.firstName,
        lastName: user.lastName,
        userId: user.userId,
        createdAt: user.createdAt,
        schedules: user.schedules
    })
})