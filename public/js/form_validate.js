document.addEventListener("DOMContentLoaded", () => {

    const profilePicContainer = document.getElementById("profilePictureClickable")
    const fileInput = document.getElementById("profileImageInput")
    const form = document.getElementById("profileImageForm")

    if (profilePicContainer && fileInput && form) {
        profilePicContainer.addEventListener("click", () => {
            fileInput.click()
        })

        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                form.submit()
            }
        })
    }

    const signup = document.getElementById("signup-form")
    const signin = document.getElementById("signin-form")
    if(signup) {
        const error = document.getElementById("error-signup")
        signup.addEventListener("submit", (e) => {
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const userId = document.getElementById('userId').value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById('signup-password').value;

            const confirmPassword = document.getElementById('confirmPassword').value;
 
            if (!firstName || !lastName || !userId || !password || !confirmPassword || !email) {
                e.preventDefault()
                error.textContent = "have to provide all fields"
                error.hidden = false
                return
              }
            if(typeof firstName !== "string" || !/^[A-Za-z]{2,20}$/.test(firstName.trim())) {
                e.preventDefault()
                error.textContent = "invalid firstname"
                error.hidden = false
                return
            }
            if(typeof lastName !== "string" || !/^[A-Za-z]{2,20}$/.test(lastName.trim())) {
                e.preventDefault()
                error.textContent = "invalid lastname"
                error.hidden = false
                return
            }
            if(typeof userId !== 'string' || !/^[A-Za-z0-9]{5,10}$/.test(userId.trim())) {
                e.preventDefault()
                error.textContent = "invalid userid"
                error.hidden = false
                return
            }
            if(typeof email !== 'string' || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                e.preventDefault()
                error.textContent = "invalid email"
                error.hidden = false
                return
            }
            if (typeof password !== 'string' || !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
                e.preventDefault()
                error.textContent = "invalid password"
                error.hidden = false
                return
            }
            if (password !== confirmPassword) {
                e.preventDefault()
                error.textContent = "passwords do not match"
                error.hidden = false
                return
            }

            error.hidden = true;
            error.textContent = "";
        })
    }

    if (signin) {
        const error = document.getElementById("error-signin")
        signin.addEventListener("submit", (e) => {
            console.log("HEL")
            const email = document.getElementById("signin-email").value.trim();
            const password = document.getElementById("signin-password").value;

            if (!email || !password) {
                e.preventDefault()
                error.textContent = "must provide all fields"
                error.hidden = false
                return
            }
            if(typeof email !== 'string' || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                e.preventDefault()
                error.textContent = "invalid email or password"
                error.hidden = false
                return
            }
            if (typeof password !== 'string' || !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
                e.preventDefault()
                error.textContent = "invalid email or password"
                error.hidden = false
                return
            }
            error.hidden = true;
            error.textContent = "";
        })
    }

    const scheduleSelect = document.getElementById("schedule-select");
    
    if (scheduleSelect){
        
        const potentialSchedules = Array.from(document.querySelectorAll(`.potential-schedule`))
        const submitButton = document.getElementById("submit-add-to-schedule");

        const refreshSchedule = () => {
            potentialSchedules.map(el => el.setAttribute("hidden", ""));
            const thisScheduleDiv = document.querySelector(`.potential-schedule[name="${scheduleSelect.value}"]`)
            thisScheduleDiv.removeAttribute("hidden");
            if (thisScheduleDiv.querySelector('.already-added, .warning')){
                submitButton.setAttribute("hidden", "");
            }
            else {
                submitButton.removeAttribute("hidden");
            }
        }
        refreshSchedule();
        scheduleSelect.addEventListener('change', refreshSchedule)
        
    }

    const newSchedule = document.getElementById('new-schedule');
    if (newSchedule){
        newSchedule.addEventListener('submit', (event) => {
            if (!newSchedule.elements['scheduleName'].value){
                event.preventDefault();
            }
        })
    }

    const comment = document.getElementById('comment-form');
    if (comment) {
        const err = document.getElementById("error-comment")
        comment.addEventListener("submit", (event) => {
            if (err) err.hidden = true;

            let title = document.getElementById('comment_title').value;
            let content = document.getElementById('comment_content').value;
            let rating = document.getElementById('comment_rating').value;

            if (!title) {
                event.preventDefault();
                err.textContent = `Error: No value for title field`;
                err.hidden = false;
                return;
            }
            if (typeof title !== 'string') {
                event.preventDefault();
                err.textContent = `Error: title is not of type \'string\'`;
                err.hidden = false;
                return;
            } 
            title = title.trim();
            if (title.length === 0) {
                event.preventDefault();
                err.textContent = `Error: title cannot consist of just spaces`;
                err.hidden = false;
                return;
            } 
            if (title.length < 3) {
                event.preventDefault();
                err.textContent = `Error: title cannot be less than 3 characters`;
                err.hidden = false;
                return;
            } 

            if (!content) {
                event.preventDefault();
                err.textContent = `Error: No value for content field`;
                err.hidden = false;
                return;
            }
            if (typeof content !== 'string') {
                event.preventDefault();
                err.textContent = `Error: content is not of type \'string\'`;
                err.hidden = false;
                return;
            } 
            content = content.trim();
            if (content.length === 0) {
                event.preventDefault();
                err.textContent = `Error: content cannot consist of just spaces`;
                err.hidden = false;
                return;
            } 
            
            if (!rating) {
                event.preventDefault();
                err.textrating = `Error: No value for rating field`;
                err.hidden = false;
                return;
            }
            if (typeof rating !== 'string') {
                event.preventDefault();
                err.textrating = `Error: rating is not of type \'string\'`;
                err.hidden = false;
                return;
            } 
            rating = rating.trim();
            if (rating.length === 0) {
                event.preventDefault();
                err.textContent = `Error: rating cannot consist of just spaces`;
                err.hidden = false;
                return;
            } 
            if (isNaN(parseFloat(rating))) {
                event.preventDefault();
                err.textContent = `Error: rating must be a number`;
                err.hidden = false;
                return;
            }
            if (rating < 0 || rating > 5) {
                event.preventDefault();
                err.textContent = `Error: rating cannot be less than 0 or greater than 5`;
                err.hidden = false;
                return;
            }
            
        })
    }
})
const confirmDeletion = (event) => {
    const confirmed = confirm("Are you sure you want to delete this schedule?");
    if (!confirmed) {
        event.preventDefault(); // Stop form from submitting
    }
}