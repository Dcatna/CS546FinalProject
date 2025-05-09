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
})