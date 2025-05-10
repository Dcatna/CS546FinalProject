document.addEventListener("DOMContentLoaded", () => {
    const profilePicContainer = document.getElementById("profilePictureClickable")
    const fileInput = document.getElementById("profileImageInput")
    const form = document.getElementById("profileImageForm")

    if (profilePicContainer && fileInput && form) {
        profilePicContainer.addEventListener("click", () => {
            fileInput.click()

        })
    }

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0 ) {
            form.submit()
        }
    })

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