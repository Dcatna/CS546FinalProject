document.addEventListener("DOMContentLoaded", () => {
    console.log("SDFSDF")
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
    console.log("👀 Signin form:", signin);
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
            error.hidden = true;
            error.textContent = "";
        })
    }

    const searchForm = document.getElementById("searchForm");
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
            const query = document.getElementById('query').value.trim();
            const professor = document.getElementById('professor').value.trim();
            const errorMessage = document.getElementById('error');

            console.log("Form submitted");

            if (!query && !professor) {
                console.log("Neither class nor professor filled");
                event.preventDefault();  
                errorMessage.textContent = 'Please enter a class name or professor.';  
            } else {
                console.log("Form is valid");
                errorMessage.textContent = '';  
            }
        });
    }
})
