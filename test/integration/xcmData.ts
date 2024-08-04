export const xcmTests  = {
  kusama: [
    {
      description: "Pallet XCM. Call limited_teleport_assets - V2 dest 1000",
      link: "https://kusama.subscan.io/extrinsic/24265902-2",
      messageId: "0x6a201a09c654a73dc6ff43890151e913fb69a7cef12d2a0c696ff928a19ec2ae",
      block: 24265902,
      eventIndex: 46,
      origin: {
        address: "EAs8ocCfK72QQNC3H3PzC4hdmo9dtUth8Unb4kgbozZyuAz",
        chain: "Kusama"
      },
      destination: {
      address: "EAs8ocCfK72QQNC3H3PzC4hdmo9dtUth8Unb4kgbozZyuAz",
      chain: "AssetHub Kusama"
      },
      token: "KSM",
      amount: "0.0250"
    },
  ],
  polkadot: [
    {
      description: "Pallet XCM. Multisig dest 1000",
      link: "https://polkadot.subscan.io/extrinsic/21497354-2",
      messageId: "0xd261442d6dd36914970669aba5bab62eeeb6889379c3b05cd7dc79e2fa681cc0",
      block: 21497354,
      eventIndex: 55,
      origin: {
        address: "13FzGLWoueKvUqFePiJgvFYWhH5KckHGtVBXvAX7SBtVZbXu",
        chain: "Polkadot"
      },
      destination: {
        address: "16bZYfxvkUGT5WbjwyJkEmZYAsBdZhMeonnaxtcuUrhzpKHm",
        chain: "AssetHub"
      },
      token: "DOT",
      amount: "49,990.0000"
    },
    {
      description: "Pallet XCM. Call limited_teleport_assets - XCM V2 dest 1000",
      link: "https://polkadot.subscan.io/extrinsic/21814508-2",
      messageId: "0x29b2d7fb57be5b21381165d89d4ea9589ddfe43371d737a1dd410ed2dd099479",
      block: 21814508,
      eventIndex: 58,
      origin: {
        address: "14Dtc5jL8Q9RwJrv4YwkcLTXqRyfBtFYDA8nG7z5ZxwRVCVP",
        chain: "Polkadot"
      },
      destination: {
        address: "14Dtc5jL8Q9RwJrv4YwkcLTXqRyfBtFYDA8nG7z5ZxwRVCVP",
        chain: "AssetHub"
      },
      token: "DOT",
      amount: "1.0035"
    },
    {
      description: "Pallet XCM. Call limited_teleport_assets - XCM V3 dest 1004",
      link: "https://polkadot.subscan.io/extrinsic/21812018-2",
      messageId: "0x122c9fa63b640ae1ada81395adf133637e0daf1539ade635602ea58544a931c2",
      block: 21812018,
      eventIndex: 58,
      origin: {
        address: "19e6YYas7iGGZzxwJh5KvAARL1XZnJXffcxxNvW3nkF9CLe",
        chain: "Polkadot"
      },
      destination: {
        address: "19e6YYas7iGGZzxwJh5KvAARL1XZnJXffcxxNvW3nkF9CLe",
        chain: "People"
      },
      token: "DOT",
      amount: "0.1500"
    },
    {
      description: "Pallet XCM. Call teleport_assets - XCM V2 dest 1001",
      link: "https://polkadot.subscan.io/extrinsic/20479101-2",
      messageId: "0x3e1c58427c4195a88858440bef03777b3cfad6160ab2ab7c92d398df410046b1",
      block: 20479101,
      eventIndex: 53,
      origin: {
        address: "16YCL3UVpVWQLGW3p3Zx4k5WAEp9W1DwdDnxAbyAaPxVxnp3",
        chain: "Polkadot"
      },
      destination: {
        address: "16YCL3UVpVWQLGW3p3Zx4k5WAEp9W1DwdDnxAbyAaPxVxnp3",
        chain: "Collectives"
      },
      token: "DOT",
      amount: "2.0000"
    },
    {
      description: "Pallet XCM. Call transfer_assets - XCM V3 dest 1000",
      link: "https://polkadot.subscan.io/extrinsic/21679999-3",
      messageId: "0x187ff78cf410141d13c8904b9ac57080f8bf320baf5e8442addf71d1204c99a5",
      block: 21679999,
      eventIndex: 64,
      origin: {
        address: "14pB37HYXX8VELDLaYX3oah4XDTvwTzS3LSb6SVmcTVNpUKZ",
        chain: "Polkadot"
      },
      destination: {
        address: "14pB37HYXX8VELDLaYX3oah4XDTvwTzS3LSb6SVmcTVNpUKZ",
        chain: "AssetHub"
      },
      token: "DOT",
      amount: "11.0000"
    },
    {
      description: "Pallet XCM. Call reserve_transfer_assets - XCM V2 dest 2012",
      link: "https://polkadot.subscan.io/extrinsic/21815927-2",
      messageId: "0x187ff78cf410141d13c8904b9ac57080f8bf320baf5e8442addf71d1204c99a5",
      block: 21815927,
      eventIndex: 57,
      origin: {
        address: "16B5hraqXvJJjNL1ZpD58dEGYHGdVHnHuoJ2kQh4KagLsF8T",
        chain: "Polkadot"
      },
      destination: {
        address: "16B5hraqXvJJjNL1ZpD58dEGYHGdVHnHuoJ2kQh4KagLsF8T",
        chain: "Parallel"
      },
      token: "DOT",
      amount: "0.8211"
    },
    {
      description: "Pallet XCM. Call limited_reserve_transfer_assets - XCM V3 dest 2000",
      link: "https://polkadot.subscan.io/extrinsic/21816282-5",
      messageId: "0x31d9b88c1edaca991ea13c12e7f156d171eaf560120f1a390f72472ca172eaee",
      block: 21816282,
      eventIndex: 78,
      origin: {
        address: "14zHCfbyPJVL2QwRE8KedRTV63dqydA5SKzfi966vAFwsGb2",
        chain: "Polkadot"
      },
      destination: {
        address: "14zHCfbyPJVL2QwRE8KedRTV63dqydA5SKzfi966vAFwsGb2",
        chain: "Acala"
      },
      token: "DOT",
      amount: "261.0000"
    },
    {
      description: "Pallet XCM. Call transfer_assets_using_type_and_then - custom XCM on dest AssetHub",
      link: "https://polkadot.subscan.io/extrinsic/21803427-4",
      messageId: "0x8ba2e8c5c034fd0ba236442273e9125f3f305343bc140442802bf62b7d403c24",
      block: 21803427,
      eventIndex: 72,
      origin: {
        address: "15dkzFquMdELBU3CpYqxW86ZDywBqfm3DcCxFYyDgsB4fbhL",
        chain: "Polkadot"
      },
      destination: {
        address: "15dkzFquMdELBU3CpYqxW86ZDywBqfm3DcCxFYyDgsB4fbhL",
        chain: "Polimec"
      },
      token: "DOT",
      amount: "2.0000"
    },
    {
      description: "Pallet XCM. Call smart contract destination - 2004 Moonbeam",
      link: "https://polkadot.subscan.io/extrinsic/21821595-3",
      messageId: "0x688157990e84d3e8455cf82e7d26b3f1dea45833cdb3716b579fed9513bdb6b4",
      block: 21821595,
      eventIndex: 64,
      origin: {
        address: "12jEnW69xZzGrU7HKZpiya3w2W6ns4ULWJwsPsnGKgUcyRAs",
        chain: "Polkadot"
      },
      destination: {
        address: "0x5f4bcf4f005a62e1364260bc115bbb3a2dbd622a",
        chain: "Moonbeam"
      },
      token: "DOT",
      amount: "20.0000"
    },
  ]
}