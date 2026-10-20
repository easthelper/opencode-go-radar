import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('builder',Path(__file__).parents[1]/'scripts/build-opencode-data.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
class BuilderTest(unittest.TestCase):
 def test_percentile(self):
  self.assertEqual(b.percentile(0,[0,1]),0);self.assertEqual(b.percentile(1,[0,1]),100)
  self.assertEqual(b.percentile(1,[1,1]),50);self.assertIsNone(b.percentile(1,[1]))
  self.assertEqual(b.percentile(0,[0,1],True),100);self.assertIsNone(b.percentile(None,[0,1]))
 def test_groups(self):
  x=[{'name':'Terminal-Bench','version':'2.1','harness':'A','score':0},{'name':'Terminal-Bench','version':'2.1','harness':'B','score':80}]
  self.assertEqual(list(b.group_best(x).values()),[80]);self.assertEqual(list(b.group_best(x,True).values()),[0,80])
 def test_source_preservation(self):
  self.assertEqual(b.norm('τ²-Bench'),'tau2 bench');self.assertEqual(b.idkey('minimax/MiniMax-M3.1-Flash'),'minimax/minimax-m3-1-flash')
 def test_number(self):
  self.assertFalse(b.number(True));self.assertTrue(b.number(0));self.assertFalse(b.number(float('nan')))
if __name__=='__main__': unittest.main()
