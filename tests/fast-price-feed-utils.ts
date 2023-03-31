import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  SetAdmin,
  SetDecription,
  SetLatestAnswer
} from "../generated/FastPriceFeed/FastPriceFeed"

export function createSetAdminEvent(
  account: Address,
  isAdmin: boolean
): SetAdmin {
  let setAdminEvent = changetype<SetAdmin>(newMockEvent())

  setAdminEvent.parameters = new Array()

  setAdminEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  setAdminEvent.parameters.push(
    new ethereum.EventParam("isAdmin", ethereum.Value.fromBoolean(isAdmin))
  )

  return setAdminEvent
}

export function createSetDecriptionEvent(description: string): SetDecription {
  let setDecriptionEvent = changetype<SetDecription>(newMockEvent())

  setDecriptionEvent.parameters = new Array()

  setDecriptionEvent.parameters.push(
    new ethereum.EventParam(
      "description",
      ethereum.Value.fromString(description)
    )
  )

  return setDecriptionEvent
}

export function createSetLatestAnswerEvent(answer: BigInt): SetLatestAnswer {
  let setLatestAnswerEvent = changetype<SetLatestAnswer>(newMockEvent())

  setLatestAnswerEvent.parameters = new Array()

  setLatestAnswerEvent.parameters.push(
    new ethereum.EventParam("answer", ethereum.Value.fromUnsignedBigInt(answer))
  )

  return setLatestAnswerEvent
}
