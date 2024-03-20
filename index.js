const                    
   express = require("express");                                                            
const Botly = require("botly");
const axios = require("axios");
const app = express();
const https = require("https");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://byhvjfuafvkhbjxirfbm.supabase.co",
  process.env.KEY,
  { auth: { persistSession: false } },
);

function keepAppRunning() {
  setInterval(
    () => {
      https.get(
        `${process.env.RENDER_EXTERNAL_URL}/ping`,
        //  "https://c1de82b2-aea7-4333-b3a6-14348c1d0f1b-00-cihd67ki3snb.riker.replit.dev/"
        (resp) => {
          if (resp.statusCode === 200) {
            console.log("Ping successful");
          } else {
            console.error("Ping failed");
          }
        },
      );
    },
    5 * 60 * 1000,
  ); // 5 minutes in milliseconds
}

const botly = new Botly({
  accessToken: process.env.TOKEN,
  notificationType: Botly.CONST.REGULAR,
  FB_URL: "https://graph.facebook.com/v2.6/",
});

/* ---- ESS ---- */

app.get("/", (req, res) => {
  res.sendStatus(200);
});

app.get("/ping", (req, res) => {
  res.status(200).json({ message: "Ping successful" });
});

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.post("/webhook", (req, res) => {
  // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(
      req.body.postback.message.sender.id,
      req.body.postback.message,
      req.body.postback.postback,
    );
  }
  res.sendStatus(200);
});

/* ---- ESS ---- */

/* ---- DATABASE ---- */

async function checkSenderId(userId) {
  const { data, error } = await supabase
    .from("Ai")
    .select("*")
    .eq("senderId", userId)
    .single();

  return data;
}

async function createUser(user) {
  const { data, error } = await supabase.from("Ai").insert([user]);

  if (error) {
    throw new Error("Error creating user : ", error);
  } else {
    return data;
  }
}

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from("Ai")
    .update(update)
    .eq("senderId", id);

  if (error) {
    throw new Error("Error updating user : ", error);
  } else {
    return data;
  }
}

/* ---- DATABASE ---- */

async function processUsers() {
  // Fetch user data from Supabase
  const { data: allUsers, error } = await supabase.from("Ai").select("*");

  if (error) {
    console.error("Error fetching user data:", error);
    return;
  }

  // Check each user's timer value
  allUsers.forEach(async (user) => {
    if (user.timer > 0) {
      // Perform your countdown action here for users with timer > 0
      // You can add specific actions or further logic for each user with a timer > 0

      // Update user data in the Supabase database
      const updateData = {
        resumetimer: true,
        waiting: true,
      };
      await updateUser(user.senderId, updateData);
    }

    if (user.imgtimer > 0) {
      // Update user data in the Supabase database
      const updateData = {
        imgwaiting: true,
        resumeimgtimer: true,
      };
      await updateUser(user.senderId, updateData);
    }
  });

  // No need to write back to the JSON file, as the data is updated in the Supabase database
}

// Call the asynchronous function
processUsers();

const onMessage = async (senderId, message) => {
  const url = "https://aichat.youxiong.win/askai";
  const headers = {
    Accept: "text/event-stream",
    "Accept-Encoding": "gzip",
    Connection: "keep-alive",
    "Content-Type": "application/json; charset=utf-8",
    Host: "aichat.youxiong.win",
    "User-Agent":
      "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/QP1A.190711.020)",
  };

  const data = {
    stream: true,
    // "uuid": "and@chatAI2@b0dda9b5-19eb-4af9-8a0c-512c085f97b9",
    uuid: "and56",
    //"session_id": "and@chatAI2@b0dda9b5-19eb-4af9-8a0c-512c085f97b9_1706203045863",
    session_id: "and@chatAI2@b0dda9b5-19eb-4af9-8a0c-512c085f97b9_99",
    message: `${message.message.text}`,

    stream: false,
    "history":[

      {
        "role": "user",
        "content": "You are the bot of AI Image Prompt Generator. \n\nyou will take a given input idea, and output a more creative, and enhanced version of the idea in the form of a fully working prompt.\n\nYou Need to know:\n\nPrompts can be very simple. Single words (or even an emoji!) will produce an image. Very short prompts will rely heavily on the bot’s default style, so a more descriptive prompt is better for a unique look. However, super-long prompts aren’t always better. Concentrate on the main concepts you want to create.\n\n##Grammar\nThe Bot does not understand grammar, sentence structure, or words like humans. Word choice also matters. More specific synonyms work better in many circumstances. Instead of big, try gigantic, enormous, or immense. Remove words when possible. Fewer words mean each word has a more powerful influence. Use commas, brackets, and hyphens to help organize your thoughts, but know the  Bot will not reliably interpret them. The  Bot does not consider capitalization.\n\n##Think About What Details Matter\nAnything left unsaid may surprise you. Be as specific or vague as you want, but anything you leave out will be randomized. Being vague is a great way to get variety, but you may not get the specific details you want.\n\nTry to be clear about any context or details that are important to you. Think about:\n\nSubject: person, animal, character, location, object, etc.\nMedium: photo, painting, illustration, sculpture, doodle, tapestry, etc.\nEnvironment: indoors, outdoors, on the moon, in Narnia, underwater, the Emerald City, etc.\nLighting: soft, ambient, overcast, neon, studio lights, etc\nColor: vibrant, muted, bright, monochromatic, colorful, black and white, pastel, etc.\nMood: Sedate, calm, raucous, energetic, etc.\nComposition: Portrait, headshot, closeup, birds-eye view, etc.\n\n##Use Collective Nouns\nPlural words leave a lot to chance. Try specific numbers. \"Three cats\" is more specific than \"cats.\" Collective nouns also work, “flock of birds” instead of \"birds.”\nThe /imagine command generates a unique image from a short text description (known as a Prompt).\n\n##Advanced Prompts\nMore advanced prompts can include multiple text phrases and one or more parameters\n\n##Basic Parameters\n\nExample Prompt: /imagine prompt: Photo realism, full body portrait of a beautiful female explorer, scaring face, running towards the camera, in a muddy trail in jurassic jungle, forest, lush vegetation, in the background a giant Tyrannosaurus rex chasing the girl with huge open mouth, heavy rain, low angle view, Dynamic motion, motion blur, rich expencive commercial photo, hypermaximalist, elegant, epic beautiful scene, Cinematic Lighting, background tilt blur, insanely detailed and intricate, hyperrealistic, super detailed, intricate details, high details, high resolution, super detailed, intricate details, high details, high resolution, 8k render artful bokeh depth of field, Melancholic, 4k, 8k, cinematic lighting, professionally retouched, dramatic lighting, emotional, highly detailed, intricate, elite, luxury, realistic, cinematic, hypermaximalist, elegant, ornate, hyper textured, colored, insane details, depth of field background, artful bokeh depth of field, artstation, deviantart, photorealistic + ultra detailed + cinematic scene + smooth + sharp features + sharp focus, insanely detailed and intricate, hypermaximalist, elegant, ornate, hyper realistic, super detailed, clear glass reflection, subsurface scattering, photo realism, warner brothers pictures, Ray Tracing Reflections, Anti - Aliasing, FXAA, TXAA, RTX, SSAO, Photography, hypermaximalist, artful bokeh depth of field, Natural Lighting, intricate details, epic movie scene, commercial professional photography, visualization most artistic way, breathtaking composition, hyper realistic, professional photography, insanely detailed and intricate, highly detailed, intricate details, Ultra Quality Award - winning Photography, Ray Tracing Reflections, hypermaximalist, hypermaximalist, hypermaximalist, focus"
      },
      {
        "role": "assistant",
        "content": "Hey there! I'm the AI Image Prompt Generator bot. I'm here to help you create awesome image prompts for all your creative needs. Just tell me what you're looking for, and I'll whip up a fully detailed and vibrant prompt that will surely spark your imagination. Let's make some magic together!"
      },
      {
        "role": "user",
        "content": "Super car"
      },
      {
        "role": "assistant",
        "content": "Sure! Here's an enhanced and more detailed image prompt for a super car:\n\nDescription: A sleek and futuristic super car, ready to tear up the road. The car is a vibrant shade of metallic blue, with sleek aerodynamic lines that exude speed and power. Its gull-wing doors are open, revealing the luxurious and high-tech interior, complete with plush leather seats and a state-of-the-art dashboard.\n\nEnvironment: The super car is parked in a high-tech underground garage, illuminated by neon lights that cast a vibrant glow. The walls are adorned with car-themed artwork, adding to the overall futuristic and stylish ambiance.\n\nLighting: The car is bathed in dramatic, cinematic lighting, with soft spotlights highlighting its curves and contours. The neon lights in the garage create interesting reflections and shadows, adding depth and intrigue to the scene.\n\nComposition: The super car is positioned at a dynamic angle, with the camera capturing it from a low and slightly tilted perspective, emphasizing its power and speed. The background features a blurred and dimly lit cityscape, hinting at the excitement and adventure that awaits the driver.\n\nMood: The overall mood is one of sophistication and adrenaline. The prompt aims to evoke a sense of luxury and thrill, showcasing the epitome of automotive engineering and design.\n\nMedium: This image prompt can be realized as a high-resolution photograph, emphasizing the exquisite details and the sleekness of the super car. Additionally, it can also be brought to life through digital illustrations or realistic 3D renderings.\n\nWith these details, you can imagine a stunning visual representation of a super car that captures the essence of speed, power, and luxury. Enjoy the ride!"
      },
    ],                    
  
  };

  const jsonData = JSON.stringify(data);

  headers["Content-Length"] = Buffer.byteLength(jsonData, "utf-8");
  axios
    .post(url, jsonData, { headers })
    .then((response) => {
      console.log(response.data.message);
      botly.send({
        id: senderId,
        message: {
          text: `${response.data.message}`,     
        },
      });
     /* botly.sendButtons({
        id: senderId,
        text: `${response.data.message}`,                    
  
        buttons: [
          botly.createPostbackButton("clear", "start"),
          // Add more buttons as needed
        ],
      });*/
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
};

const onPostBack = async (senderId, message, postback) => {};

/*fetchDataAndPost();

// Refresh data every 2 minutes
setInterval(fetchDataAndPost,   0.2* 60 * 1000); */

app.listen(3000, () => {
  console.log(`App is on port : 3000`);
  keepAppRunning();
});
