import s from "./page.module.css";
import { Calc } from "@/components";

export default function Home() {
  return (
    <div className={s.container}>
      <Calc />
    </div>
  );
}
