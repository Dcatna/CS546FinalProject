document.addEventListener("DOMContentLoaded", () => {
    const profilePicContainer = document.getElementById("profilePictureClickable")
    const fileInput = document.getElementById("profileImageInput")
    const form = document.getElementById("profileImageForm")
    console.log("HELLO")
    if (profilePicContainer && fileInput && form) {
        profilePicContainer.addEventListener("click", () => {
            fileInput.click()
            console.log("HELLO2")

        })
    }

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0 ) {
            form.submit()
        }
    })
})