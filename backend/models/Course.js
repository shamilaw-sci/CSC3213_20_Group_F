// Add this to your courseRoutes.js to test:
router.post('/test-add', async (req, res) => {
    try {
        const newCourse = new Course({ 
            title: "React 101", 
            description: "Learn the basics of React", 
            teacherName: "Pathum" 
        });
        await newCourse.save();
        res.send("Course saved to database successfully!");
    } catch (err) {
        res.status(500).send("Error saving: " + err.message);
    }
});