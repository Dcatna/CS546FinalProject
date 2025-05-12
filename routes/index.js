import userRoutes from "./users.js"
import facultyRoutes from "./faculty.js"

const constructorMethod = (app) => {
    app.use('/', userRoutes)
    app.use('/faculty', facultyRoutes);

    app.use("*", (req, res) => {
        res.sendStatus(404)
    })
}

export default constructorMethod