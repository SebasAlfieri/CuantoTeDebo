import s from "./page.module.css";
import { Calc } from "@/components";
import Image from "next/image";

export default function Home() {
  return (
    <div className={s.container}>
      <Calc />

      <a
        href="https://cafecito.app/cuantotedebo"
        rel="noopener"
        target="_blank"
      >
        <Image
          width={384}
          height={80}
          src={"/icons/cafecito.png"}
          alt="Cafecito App link"
        />
      </a>
    </div>
  );
}
