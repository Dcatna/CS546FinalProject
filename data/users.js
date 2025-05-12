import { type } from "os";
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { courses, users } from "../config/mongoCollections.js";

export async function register(userId, firstName, lastName, emailAddr, password) { //returns the valid user object
    //basic checks
    if(!userId || typeof userId !== "string" ) { //prolly jsut gonna check objectid too 
        throw new Error("invalid userId")
    }
    if(!firstName || typeof firstName !== "string" || !lastName || typeof lastName !== "string") {
        throw new Error("invalid first or last name")
    }
    if(!emailAddr || typeof emailAddr !== "string" || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailAddr)) {
        throw new Error("invalid email address")
    }
    if(!password || typeof password !== "string" || !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
        throw new Error("invalid password")
    }

    //register logic

    const userCollection = await users()
    const duplicate = await userCollection.findOne({ userId: userId})
    if(duplicate) {
      throw new Error("duplicate userid")
    }
    const dupliacteEmail = await userCollection.findOne({emailAddr: emailAddr})
    if(dupliacteEmail) {
        throw new Error("duplicate email address")
    }

    const day = new Date()
    const yyyy = day.getFullYear()
    let mm = day.getMonth() + 1
    let dd = day.getDate()
  
    if (dd < 10) dd = '0' + dd
    if (mm < 10) mm = '0' + mm
  
    const currDay = mm + '/' + dd + '/' + yyyy
    const hashedPass = await bcrypt.hash(password, 10)

    const user = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        userId: userId,
        password: hashedPass,
        emailAddr: emailAddr,
        createdAt: currDay,
        schedules: [],
        profileImage: null,
        public: true,
        comments: []
    }

    const insertRes = await userCollection.insertOne(user)
    if(!insertRes.acknowledged) {
        throw new Error("registration failed")
    }

    return {registrationCompleted: true} //maybe just return the user to login them in right away or just pass completed and do the same?

}

export async function logIn(emailAddr, password) {
    if(!emailAddr || typeof emailAddr !== "string") {
        throw new Error("invalid email address")
    }
    if (!password || typeof password !== "string") {
        throw new Error("invalid password")
    }

    const userCollection = await users()
    const user = await userCollection.findOne({ emailAddr: emailAddr })
    if(!user) {
        throw new Error("invalid email or password")
    }
    const passMatch = await bcrypt.compare(password, user.password)
    if (!passMatch) {
      throw new Error("invalid email or password")
    }

    return user //just return the user to pass its info to the profile page

}

export async function getProfilePicture(userId) {

    const userCollection = await users();
    const user = await userCollection.findOne({ userId: userId})

    if (!user) {
        throw new Error("invalid user ID")
    }

    if (!user.profileImage) { //if no image just return null
        return null
    }
    return { //else we will return the object of the image and its type
        data: user.profileImage.data.buffer,
        contentType: user.profileImage.contentType
    }

}

export async function setProfilePicture(userId, buffer, contentType) {
    const userCollection = await users();
  
    const result = await userCollection.updateOne(
      { userId: userId },
      {
        $set: {
          profileImage: {
            data: buffer,
            contentType: contentType
          }
        }
      }
    )
  
    if (result.modifiedCount === 0) {
      throw new Error("failed to update profile picture")
    }
  
    return true
}

export async function getUserProfileById(userId) {
    if (typeof userId !== "string") {
        throw new Error("invalid user id")
    }

    const userCollection = await users();
    const user = await userCollection.findOne({ userId: userId })

    if(!user) {
        throw new Error("invalid user id")
    }
    return user
    
}

export async function toggleUserPrivacyById(userId, isPublic) {
    if (typeof userId !== 'string') {
        throw new Error("invalid user id")
      }
    
      const userCollection = await users();
    
      const user = await userCollection.findOne({ userId: userId })
      if (!user) {
        throw new Error("user not found")
      }
    
      const result = await userCollection.updateOne(
        { userId: userId },
        { $set: { public: isPublic } }
      )
  
      if (result.modifiedCount === 0) {
        throw new Error("failed to update profile picture")
      }
      return true

}

export const addSchedule = async (schedule, session) => {
  const coursesCollection = await courses();
  const usersCollection = await users();

  if (!schedule) throw 'No schedule object';
  if (!session || !session.user) throw 'Invalid session';
  if (!schedule.name || typeof(schedule.name) != 'string' || !Array.isArray(schedule.courses)) throw 'Invalid schedule properties';
  
  //check if all the courses in the new schedule exist. In theory this should happen in parallel, but idk async stuff is weird
  await Promise.all(schedule.courses.map(async (courseId) => {
    if (!await coursesCollection.findOne({_id: new ObjectId(courseId)})) throw 'Course does not exist';
    
  }))
  //check if the user already has a schedule with this name
  for (const userSchedule of session.user.schedules){
    if (userSchedule.name == schedule.name) throw 'Schedule with that name already exists';
  }
  const scheduleId = new ObjectId();
  const res = await usersCollection.findOneAndUpdate({userId: session.user.userId}, {$push: {schedules: {_id: scheduleId, name: schedule.name, courses: schedule.courses.map(cId => new ObjectId(cId))}}});
  if (!res) throw 'Error updating database';
  session.user.schedules.push({_id: scheduleId, name: schedule.name, courses: schedule.courses});
}

export const removeSchedule = async (name, session) => {
  if (!name) throw 'No name provided';
  if (typeof(name) != 'string') throw 'Name not a string';
  if (!session || !session.user) throw 'Invalid session';

  const scheduleIdx = session.user.schedules.findIndex(schedule => schedule.name === name);
  if (scheduleIdx == -1) throw 'No schedule with that name exists';

  const usersCollection = await users();
  const res = usersCollection.findOneAndUpdate(
    {userId: session.user.userId},
    { $pull: { schedules: { name: name } } }
  );
  if (res.modifiedCount == 0) {
    throw 'Unable to remove schedule with that name';
  }

  session.user.schedules.splice(scheduleIdx, 1);
}