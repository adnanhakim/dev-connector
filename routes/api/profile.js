const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const config = require('config');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
   try {
      const profile = await Profile.findOne({
         user: req.user.id
      }).populate('user', ['name', 'avatar']);

      if (!profile) {
         return res
            .status(400)
            .json({ errors: [{ msg: 'There is no profile for this user' }] });
      }

      res.status(200).json(profile);
   } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
   }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private
router.post(
   '/',
   [
      auth,
      [
         check('status', 'Status is required')
            .not()
            .isEmpty(),
         check('skills', 'Skills is required')
            .not()
            .isEmpty()
      ]
   ],
   async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
      }

      const {
         company,
         website,
         location,
         status,
         skills,
         bio,
         githubUsername,
         facebook,
         instagram,
         twitter,
         linkedin,
         youtube
      } = req.body;

      // Build profile object
      const profileFields = {};
      profileFields.user = req.user.id;
      if (company) profileFields.company = company;
      if (website) profileFields.website = website;
      if (location) profileFields.location = location;
      if (status) profileFields.status = status;
      if (skills) {
         profileFields.skills = skills.split(',').map(skill => skill.trim());
      }
      if (bio) profileFields.bio = bio;
      if (githubUsername) profileFields.githubUsername = githubUsername;

      // Build social object
      profileFields.social = {};
      if (facebook) profileFields.social.facebook = facebook;
      if (instagram) profileFields.social.instagram = instagram;
      if (twitter) profileFields.social.twitter = twitter;
      if (linkedin) profileFields.social.linkedin = linkedin;
      if (youtube) profileFields.social.youtube = youtube;

      try {
         let profile = await Profile.findOne({ user: req.user.id });

         if (profile) {
            // Update
            profile = await Profile.findOneAndUpdate(
               { user: req.user.id },
               { $set: profileFields },
               { new: true }
            );

            return res.status(200).json(profile);
         }

         // Create profile
         profile = new Profile(profileFields);

         await profile.save();
         res.status(200).json(profile);
      } catch (err) {
         console.error(err.message);
         res.status(500).send('Server error');
      }
   }
);

// @route   GET api/profile
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
   try {
      const profiles = await Profile.find().populate('user', [
         'name',
         'avatar'
      ]);
      res.status(200).json(profiles);
   } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
   }
});

// @route   GET api/profile/user/:userId
// @desc    Get profile by id
// @access  Public
router.get('/user/:userId', async (req, res) => {
   try {
      const profile = await Profile.findOne({
         user: req.params.userId
      }).populate('user', ['name', 'avatar']);

      if (!profile) {
         return res.status(400).json({ msg: 'Profile not found' });
      }

      res.status(200).json(profile);
   } catch (err) {
      console.error(err.message);
      if (err.kind == 'ObjectId') {
         return res.status(400).json({ msg: 'Profile not found' });
      }
      res.status(500).send('Server error');
   }
});

// @route   DELETE api/profile
// @desc    Delete profile, user & posts
// @access  Private
router.delete('/', auth, async (req, res) => {
   try {
      // TODO: Remove user's posts
      // Remove profile
      await Profile.findOneAndRemove({ user: req.user.id });

      // Remove user
      await User.findOneAndRemove({ _id: req.user.id });
      res.status(200).json('User deleted');
   } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
   }
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private
router.put(
   '/experience',
   [
      auth,
      [
         check('title', 'Title is required')
            .not()
            .isEmpty(),
         check('company', 'Company is required')
            .not()
            .isEmpty(),
         check('from', 'From date is required')
            .not()
            .isEmpty()
      ]
   ],
   async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
      }

      const {
         title,
         company,
         location,
         from,
         to,
         current,
         description
      } = req.body;

      const newExperience = {};
      if (title) newExperience.title = title;
      if (company) newExperience.company = company;
      if (location) newExperience.location = location;
      if (from) newExperience.from = from;
      if (to) newExperience.to = to;
      if (current) newExperience.current = current;
      if (description) newExperience.description = description;

      try {
         const profile = await Profile.findOne({ user: req.user.id });
         profile.experience.unshift(newExperience);
         await profile.save();

         res.status(200).json(profile);
      } catch (err) {
         console.error(err.message);
         res.status(500).send('Server error');
      }
   }
);

// @route   DELETE api/profile/experience
// @desc    Delete profile experience
// @access  Private
router.delete('/experience/:experienceId', auth, async (req, res) => {
   try {
      const profile = await Profile.findOne({ user: req.user.id });

      // Get remove index
      const removeIndex = profile.experience
         .map(item => item.id)
         .indexOf(req.params.experienceId);

      profile.experience.splice(removeIndex, 1);

      await profile.save();
      res.status(200).json(profile);
   } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
   }
});

// @route   PUT api/profile/education
// @desc    Add profile education
// @access  Private
router.put(
   '/education',
   [
      auth,
      [
         check('school', 'School is required')
            .not()
            .isEmpty(),
         check('degree', 'Degree is required')
            .not()
            .isEmpty(),
         check('fieldOfStudy', 'Field of study is required')
            .not()
            .isEmpty(),
         check('from', 'From date is required')
            .not()
            .isEmpty()
      ]
   ],
   async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
      }

      const {
         school,
         degree,
         fieldOfStudy,
         from,
         to,
         current,
         description
      } = req.body;

      const newEducation = {};
      if (school) newEducation.school = school;
      if (degree) newEducation.degree = degree;
      if (fieldOfStudy) newEducation.fieldOfStudy = fieldOfStudy;
      if (from) newEducation.from = from;
      if (to) newEducation.to = to;
      if (current) newEducation.current = current;
      if (description) newEducation.description = description;

      try {
         const profile = await Profile.findOne({ user: req.user.id });
         profile.education.unshift(newEducation);
         await profile.save();

         res.status(200).json(profile);
      } catch (err) {
         console.error(err.message);
         res.status(500).send('Server error');
      }
   }
);

// @route   DELETE api/profile/education
// @desc    Delete profile education
// @access  Private
router.delete('/education/:educationId', auth, async (req, res) => {
   try {
      const profile = await Profile.findOne({ user: req.user.id });

      // Get remove index
      const removeIndex = profile.education
         .map(item => item.id)
         .indexOf(req.params.educationId);

      profile.education.splice(removeIndex, 1);

      await profile.save();
      res.status(200).json(profile);
   } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
   }
});

module.exports = router;
