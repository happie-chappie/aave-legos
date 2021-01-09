const { assert } = require("chai");

describe("Escrow", function () {
    let escrow;
    let aWETH;
    let arbiter;
    let beneficiary;
    let depositor;
    const deposit = ethers.utils.parseEther("1");
    before(async () => {
        const Escrow = await ethers.getContractFactory("Escrow");
        [depositor, arbiter, beneficiary] = await ethers.provider.listAccounts();
        escrow = await Escrow.deploy(arbiter, beneficiary, { value: deposit });
        await escrow.deployed();
        aWETH = await ethers.getContractAt("IERC20", "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e");
    });

    it("should not have an ether balance", async function () {
        const balance = await ethers.provider.getBalance(escrow.address);
        assert.equal(balance.toString(), "0");
    });

    it("should have aWETH", async function () {
        const balance = await aWETH.balanceOf(escrow.address);
        assert.equal(balance.toString(), deposit.toString());
    });

    describe('after approving', () => {
        let beneficiaryBalanceBefore;
        let depositorBalanceBefore;
        before(async () => {
            beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary);
            depositorBalanceBefore = await ethers.provider.getBalance(depositor);
            const thousandDays = 1000 * 24 * 60 * 60;
            await hre.network.provider.request({
                method: "evm_increaseTime",
                params: [thousandDays]
            });
            const arbiterSigner = await ethers.provider.getSigner(arbiter);
            await escrow.connect(arbiterSigner).approve();
        });

        it('should provide the principal to the beneficiary', async () => {
            const balanceAfter = await ethers.provider.getBalance(beneficiary);
            const diff = balanceAfter.sub(beneficiaryBalanceBefore);
            assert.equal(diff.toString(), deposit.toString());
        });

        it('should transfer interest to the depositor', async () => {
            const balanceAfter = await ethers.provider.getBalance(depositor);
            const diff = balanceAfter.sub(depositorBalanceBefore);
            assert(diff.gt(0), "expected interest to be sent to the original depositor");
        });
    });
});

