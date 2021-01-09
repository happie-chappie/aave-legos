const { assert } = require("chai");
const getDai = require('./getDai');

describe('Lottery', function () {
    let lottery;
    let dai;
    let aDai;
    let purchasers;
    const ticketPrice = ethers.utils.parseEther("100");
    before(async () => {
        dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
        aDai = await ethers.getContractAt("IERC20", "0x028171bCA77440897B824Ca71D1c56caC55b68A3");

        purchasers = (await ethers.provider.listAccounts()).slice(1, 4);
        await getDai(dai, purchasers);

        const Lottery = await ethers.getContractFactory("Lottery");
        lottery = await Lottery.deploy();
        await lottery.deployed();
    });

    it('should set the lottery drawing', async () => {
        const drawing = await lottery.drawing();
        assert(drawing);
    });

    describe('after multiple purchases', () => {
        before(async () => {
            for (let i = 0; i < purchasers.length; i++) {
                const signer = await ethers.provider.getSigner(purchasers[i]);
                await dai.connect(signer).approve(lottery.address, ticketPrice);
                await lottery.connect(signer).purchase();
            }
        });

        it('should have an aDai balance', async () => {
            const balance = await aDai.balanceOf(lottery.address);
            assert(balance.gte(ticketPrice.mul(purchasers.length)));
        });

        describe('after picking a winner', () => {
            let tx;
            before(async () => {
                const unixSeconds = Date.now() / 1000;
                const oneWeek = 8 * 24 * 60 * 60;
                await hre.network.provider.request({
                    method: "evm_setNextBlockTimestamp",
                    params: [unixSeconds + oneWeek]
                });
                await hre.network.provider.request({ method: "evm_mine" });
                let response = await lottery.pickWinner();
                tx = await response.wait();
            });

            it('should emit an event', async () => {
                const winnerEvent = tx.events.find(x => x.event === "Winner");
                assert(winnerEvent, "Expected a winner event to be emitted");
            });

            it('should no longer have an aDai balance', async () => {
                const balance = await aDai.balanceOf(lottery.address);
                assert(balance.eq("0"));
            });

            it('should provide each purchaser with their initial balance', async () => {
                for (let i = 0; i < purchasers.length; i++) {
                    const address = purchasers[i];
                    const balance = await dai.balanceOf(address);
                    assert(balance.gte(ticketPrice));
                }
            });

            it('should provide the winner with the interest', async () => {
                const winnerEvent = tx.events.find(x => x.event === "Winner");
                const winner = winnerEvent.args[0];
                const balance = await dai.balanceOf(winner);
                assert(balance.gt(ticketPrice));
            });
        });
    });
});

