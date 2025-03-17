import React, { useState } from "react";
import { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Button from "src/components/Button";
import { add } from "src/utils/math";
import { json } from "@remix-run/node";
import "~/styles/pages/newPage.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Example Page" },
    { name: "description", content: "This is an example page using various features." },
  ];
};

export const loader: LoaderFunction = async () => {
  const message = "Hello from the server!";
  return json({ message });
};

export default function NewPage() {
  const data = useLoaderData();
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log("Button clicked");
    setCount(add(count, 1));
  };

  return (
    <div>
      <h1>Example Page</h1>
      <p>{data.message}</p>
      <p>Count: {count}</p>
      <Button label="Increment" onClick={handleClick} />
    </div>
  );
}