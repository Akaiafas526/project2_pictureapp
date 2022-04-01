const router = require('express').Router();
const { Post } = require('../../models');
const authorize = require('../../utils/auth');
const path = require('path');
const multer = require('multer');
const fs = require('fs');


// Sets storage folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },

  // Creates random file name using the original name with a random string of numbers based on the current time to prevent duplicate names
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    
    cb(null, path.parse(file.originalname).name.replace(' ','') + '-' + uniqueSuffix+path.extname(file.originalname))
  }
})


// Sets the storage and using a filter function to ensure the file is of the few allowed file types
const upload = multer({ storage: storage,  fileFilter: function (req, file, callback) {
  var ext = path.extname(file.originalname);
  if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
      return callback(new Error('Only images are allowed'))
  }
  callback(null, true)
}

})


// withAuth
router.post('/', authorize,upload.single('picture'), async (req, res) => {
    try {
      (req.body.tagId==='all'||!req.body.tagId)?tagid=null:tagid=req.body.tagId
        // const tagid = req.body.tagId || null
        const newPost = await Post.create({
            title:req.body.title,
            description:req.body.description,
            // userId:1,
            tagId:tagid,
            userId: req.session.userId,
            picture:`/uploads/${req.file.filename}`
        });
        
        res.status(200).json(newPost)
    } catch (err) {
        res.status(400).json(err);
    }
});


// withAuth
router.put('/:id',authorize,  async (req, res) => {
  try {
    const [ affectedRows ] = await Post.update(req.body, {
      
      where:{
        id:req.params.id,
        // userId:1
        userId:req.session.userId
      }

    });

    if (affectedRows){
        res.status(200).json('Post updated!');
    } else {
        res.status(404).json('Post not updated')
    }
  } catch (err) {
    res.status(400).json(err);
  }
});
// withAuth
router.delete('/:id', authorize, async (req, res) => {
  try {
    const postPicture = await Post.findByPk(req.params.id)
    const deletedPost = await Post.destroy({
      where: {
        id: req.params.id,
        // user_id:1
        // user_id: req.session.user_id,
      },
    });

    if (!deletedPost) {
      res.status(404).json({ message: 'Invalid post ID!' });
      return;
    }

    // Prevents seed pictures from being deleted
    if (!postPicture.picture.slice(0,18)==='/uploads/protected'){
      fs.unlink(`./public${postPicture.picture}`,(err)=>{
        err?console.log(err):console.log('Deleted');
      })
    }
    res.status(200).json('Post Deleted');
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
