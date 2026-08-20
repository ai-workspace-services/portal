import NotFound, { metadata } from "../../src/app/not-found"

import { ConsoleHandoff } from "./ConsoleHandoff"

export { metadata }

export default function StaticNotFound() {
  return (
    <>
      <ConsoleHandoff />
      <NotFound />
    </>
  )
}
