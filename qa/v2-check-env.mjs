// Check-stream QA defaults (the shell here can't set env vars inline). Import before ./lib.mjs.
process.env.QA_BASE ??= "http://localhost:3100";
process.env.QA_SHOTS ??= "C:/my_projects/projects/InternShield/.git/internshield-relay/v2-shots/check";
process.env.QA_PORT_RANGE ??= "3100-3199";
process.env.QA_OUT ??= "qa/out-v2-check.txt";
