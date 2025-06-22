import express, { Request, Response, NextFunction } from "express";
import { notFound } from "@middlewares/notfound";
import { errorHandler } from "@middlewares/errorHandler";
import cors from "cors";
import AuthRouter from "@routes/authRouter";
import UserRouter from "@routes/userRouter";
import FaqRouter from "@routes/faqRouter";
import TaCRouter from "@routes/tacRouter";
import PrivacyRouter from "@routes/privacyRouter";
import { requestLogger } from "@middlewares/requestLogger";
import ContactRouter from "@routes/contactRouter";
import VersionRouter from "@routes/versionRouter";
import NotificationRouter from "@routes/notificationRouter";
import ActivityRouter from "@routes/activityRouter";
import FriendRequestRouter from "@routes/friendRequestRouter";
import FriendRouter from "@routes/friendRouter";
import BlockedUserRouter from "@routes/blockedUserRouter";
import AdminRouter from "@routes/adminRouter";
import LikeRouter from "@routes/likesRouter";
import bodyParser from "body-parser";

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: false,
  })
);
app.use(requestLogger);
// app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello From the slyd social server");
});

const routes = [
  { path: "/auth", router: AuthRouter },
  { path: "/user", router: UserRouter },
  { path: "/admin", router: AdminRouter },
  { path: "/friend-request", router: FriendRequestRouter },
  { path: "/friend", router: FriendRouter },
  { path: "/blocked", router: BlockedUserRouter },
  { path: "/activity", router: ActivityRouter },
  { path: "/faq", router: FaqRouter },
  { path: "/tac", router: TaCRouter },
  { path: "/privacy", router: PrivacyRouter },
  { path: "/contact", router: ContactRouter },
  { path: "/version", router: VersionRouter },
  { path: "/notification", router: NotificationRouter },
  { path: "/likes", router: LikeRouter },
];

routes.forEach((route) => {
  app.use(route.path, route.router);
});
app.use("/**", notFound);

app.use(errorHandler);

export default app;
